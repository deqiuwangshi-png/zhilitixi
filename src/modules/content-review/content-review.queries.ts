// 内容审核模块：查询层（数据访问）。
// 三表（discoveries / square_posts / url_audit）合并为统一审核列表。
// 008 迁移新增只读视图 v_content_review_catalog，在数据库层完成 UNION 合并并归一化
// status/category/search 列；本层对视图执行全局 count:'exact' + order + range 分页，
// status/type/category/q 全部下沉到 WHERE，彻底去掉旧的“每表 limit(100) 有界拉取 +
// 合并行内切片”，根治丢行 / 截断 / 失序。
// 说明：q 由原来的“标题或作者”扩展为视图归一化 search_text（含标题/摘要/内容/作者名）——
// 下沉到数据库后必须以归一化列检索，检索面略宽但语义等价、total 口径一致。
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import { discoveryRowToItem, squareRowToItem, urlRowToItem, type RowContext } from './content-review.mapper';
import { DEFAULT_PAGE_SIZE, SIZES } from './content-review.schema';
import type {
  ContentReviewCatalogViewRow,
  DiscoveriesRow,
  SquarePostsRow,
  UrlAuditRow,
} from '@/lib/db-types';
import type { ReviewItem, ReviewListQuery, ReviewPageResult } from './content-review.types';

/** 前端“内容类型”中文值 → 视图 src 分类（DB 级筛选） */
const TYPE_TO_SRC: Record<string, string> = {
  发现: 'discovery',
  市集: 'square',
  URL: 'url',
};

/** pageSize 白名单收敛，非法值回退默认，禁止固定 limit(500) 式全量拉取 */
function sanitizePageSize(size: number): number {
  return (SIZES as readonly number[]).includes(size) ? size : DEFAULT_PAGE_SIZE;
}

/** 视图行 → mapper 期望的裸行 → 统一审核 DTO（按 src 路由到对应 mapper） */
function toReviewItem(v: ContentReviewCatalogViewRow, ctx: RowContext): ReviewItem {
  if (v.src === 'discovery') {
    return discoveryRowToItem(
      {
        id: v.id,
        author_id: v.author_id,
        type: v.type,
        title: v.title,
        note: v.note,
        description: v.description,
        media_url: v.media_url,
        reason: v.reason,
        review_status: v.review_status,
        views: v.views,
        created_at: v.created_at,
      } as unknown as DiscoveriesRow,
      ctx,
    );
  }
  if (v.src === 'square') {
    return squareRowToItem(
      {
        id: v.id,
        author_id: v.author_id,
        content: v.content,
        image_url: v.image_url,
        category: v.category,
        url_status: v.url_status,
        review_status: v.review_status,
        views: v.views,
        created_at: v.created_at,
      } as unknown as SquarePostsRow,
      ctx,
    );
  }
  // url_audit：authorName 固定 '—'，无需用户名列
  return urlRowToItem({
    id: v.url_id ?? 0,
    url: v.url,
    host: v.host,
    risk: v.risk,
    created_at: v.created_at,
  } as unknown as UrlAuditRow);
}

/**
 * 内容审核列表：三表合并（union 视图）+ 数据库级筛选 + 全局分页。
 * total 使用 count:'exact'，status/type/category/q 全部下沉到 WHERE。无每表硬上限。
 */
export async function listContent(query: ReviewListQuery): Promise<ReviewPageResult<ReviewItem>> {
  const page = Math.max(1, Math.floor(query.page) || 1);
  const pageSize = sanitizePageSize(query.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const client = getSupabasePrivilegedClient();
  let builder = client
    .from('v_content_review_catalog')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  // 状态筛选 → 归一化 norm_status
  if (query.status) builder = builder.eq('norm_status', query.status);
  // 内容类型筛选（中文）→ src 分类
  if (query.type && TYPE_TO_SRC[query.type]) builder = builder.eq('src', TYPE_TO_SRC[query.type]);
  // 分类筛选 → 归一化 norm_category
  if (query.category) builder = builder.eq('norm_category', query.category);
  // 关键词筛选 → 归一化 search_text
  if (query.q?.trim()) {
    builder = builder.ilike('search_text', `%${query.q.trim()}%`);
  }

  const { data, count, error } = await builder.range(from, to);
  if (error) throw new Error(`listContent(v_content_review_catalog) failed: ${error.message}`);
  const rows = (data ?? []) as ContentReviewCatalogViewRow[];

  // 作者名已由视图联表提供，直接构建映射，避免二次回查
  const userNames: Record<string, string> = {};
  for (const r of rows) {
    if (r.author_id && r.author_name) userNames[r.author_id] = r.author_name;
  }
  const ctx: RowContext = { userNames };

  const items = rows.map((r) => toReviewItem(r, ctx));
  const total = count ?? 0;

  return {
    rows: items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** 全部分类候选（去重，供筛选下拉）；三表有界拉取代价较低的投影列 */
export async function listCategories(): Promise<string[]> {
  const client = getSupabasePrivilegedClient();
  const [dd, ss, uu] = await Promise.all([
    client.from('discoveries').select('type').limit(200),
    client.from('square_posts').select('category').limit(200),
    client.from('url_audit').select('host').limit(200),
  ]);
  const set = new Set<string>();
  for (const r of dd.data ?? []) if (r.type) set.add(r.type);
  for (const r of ss.data ?? []) if (r.category) set.add(r.category);
  for (const r of uu.data ?? []) if (r.host) set.add(r.host);
  return Array.from(set).sort();
}