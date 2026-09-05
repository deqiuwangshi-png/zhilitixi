// 商品治理模块：查询层（数据访问）。
// 商品列表 = discoveries（商业化内容）∪ square_posts（带链接帖子）跨表合并。
// 008 迁移新增只读视图 v_product_catalog，在数据库层完成 UNION 合并；本层对视图执行
// 全局 count:'exact' + order + range 分页，source/type/status/q 全部下沉到 WHERE，
// 根治旧“每表窗口 + 合并切片”导致的丢行 / 截断 / 失序。
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import { discoveryToDto, squareToDto } from './product-gov.mapper';
import { DEFAULT_PAGE_SIZE, SIZES } from './product-gov.schema';
import type { ProductCatalogViewRow } from '@/lib/db-types';
import type { ProductItem, ProductListQuery, ProductPageResult, ProductStats } from './product-gov.types';

/** pageSize 白名单收敛，非法值回退默认，禁止固定 limit(500) 式全量拉取 */
function sanitizePageSize(size: number): number {
  return (SIZES as readonly number[]).includes(size) ? size : DEFAULT_PAGE_SIZE;
}

/** 联表用户名（仅回查返回窗口对应的作者，避免整表拉取） */
async function fetchAuthorNames(ids: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(ids.filter((x): x is string => !!x)));
  if (!unique.length) return {};
  const client = getSupabasePrivilegedClient();
  const { data } = await client.from('users').select('id,name').in('id', unique);
  const names: Record<string, string> = {};
  for (const u of data ?? []) names[u.id] = u.name ?? '';
  return names;
}

/**
 * 商品列表：数据库级全局筛选 + 分页（基于 v_product_catalog union 视图）。
 * - type 命中单一来源时也走视图（src 分类，全在 DB 完成）；
 * - all/no-type 天然全量走视图，避免跨表合并丢行/失序。
 */
export async function listProducts(query: ProductListQuery): Promise<ProductPageResult<ProductItem>> {
  const page = Math.max(1, Math.floor(query.page) || 1);
  const pageSize = sanitizePageSize(query.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const client = getSupabasePrivilegedClient();
  let builder = client
    .from('v_product_catalog')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  // 来源筛选：commercial → discoveries；square → square_posts
  if (query.type === 'commercial') builder = builder.eq('src', 'discovery');
  else if (query.type === 'square') builder = builder.eq('src', 'square');
  // 状态筛选下沉到归一化 down_flag
  if (query.status === 'up') builder = builder.eq('down_flag', false);
  else if (query.status === 'down') builder = builder.eq('down_flag', true);
  // 关键词筛选下沉到归一化 search_text
  if (query.q?.trim()) {
    builder = builder.ilike('search_text', `%${query.q.trim()}%`);
  }

  const { data, count, error } = await builder.range(from, to);
  if (error) throw new Error(`listProducts(v_product_catalog) failed: ${error.message}`);
  const rows = (data ?? []) as ProductCatalogViewRow[];

  const names = await fetchAuthorNames(rows.map((r) => r.author_id ?? ''));

  // 视图行 → mapper 期望的裸行 → DTO（discovery / square 各自组装，status/来源字段对齐）
  const items: ProductItem[] = rows.map((r) =>
    r.src === 'discovery'
      ? discoveryToDto(
          {
            id: r.id,
            author_id: r.author_id,
            type: r.content_type,
            title: r.title,
            note: r.note,
            description: r.description,
            commercial: r.commercial,
            promo_type: r.promo_type,
            commission: r.commission,
            url: r.url,
            reason: r.reason,
            created_at: r.created_at,
          },
          names,
        )
      : squareToDto(
          {
            id: r.id,
            author_id: r.author_id,
            content: r.content,
            category: r.category,
            url: r.url,
            url_status: r.url_status,
            created_at: r.created_at,
          },
          names,
        ),
  );

  const total = count ?? 0;
  return {
    rows: items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** 顶部统计卡：商品总数 / 商业化内容 / 带链接帖子 / 高风险，全部数据库 count:'exact' */
export async function getProductStats(): Promise<ProductStats> {
  const client = getSupabasePrivilegedClient();
  const commercialQ = client
    .from('discoveries')
    .select('id', { count: 'exact' })
    .or('commercial.is.true,commission.not.is.null,promo_type.not.is.null');
  const linkedQ = client.from('square_posts').select('id', { count: 'exact' }).not('url', 'is', null);
  const riskDiscQ = client
    .from('discoveries')
    .select('id', { count: 'exact' })
    .or('commercial.is.true,commission.not.is.null,promo_type.not.is.null')
    .not('reason', 'is', null);
  const riskSquareQ = client
    .from('square_posts')
    .select('id', { count: 'exact' })
    .not('url', 'is', null)
    .eq('url_status', 'blocked');

  const [commercialRes, linkedRes, riskDiscRes, riskSquareRes] = await Promise.all([
    commercialQ,
    linkedQ,
    riskDiscQ,
    riskSquareQ,
  ]);

  const commercial = commercialRes.count ?? 0;
  const linked = linkedRes.count ?? 0;
  const riskHigh = (riskDiscRes.count ?? 0) + (riskSquareRes.count ?? 0);

  return { total: commercial + linked, commercial, linked, riskHigh };
}