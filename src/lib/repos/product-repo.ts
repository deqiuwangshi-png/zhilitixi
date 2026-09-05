// 商品治理仓储层：商业化内容合并列表 + 编辑/删除写操作。
// TODO: 模块化迁移至 src/modules/product-gov（查询走 `listProducts` / `getProductStats`，
// 写操作经 commands 复用本文件的 applyProductEdit/deleteProduct）。以下导出保留供旧引用兼容。
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { DiscoveriesRow, SquarePostsRow } from '@/lib/db-types';

export type ProductSource = 'discovery' | 'square';
export type ProductStatus = '上架' | '下架';

export interface ProductItem {
  source: ProductSource;
  id: string;
  title: string;
  kind: string;
  commercial: boolean;
  commission: string | number | null;
  promoType: string;
  url: string;
  status: ProductStatus;
  authorName: string;
  createdAt: string | null;
  reason: string | null;
}

export interface ProductStats {
  total: number;
  commercial: number;
  linked: number;
  riskHigh: number;
}

export interface ProductData {
  rows: ProductItem[];
  stats: ProductStats;
}

/** 商业化内容（discoveries 标记 / 带链接 square_posts）合并列表 + 统计 */
export async function listProducts(): Promise<ProductData> {
  const client = getSupabaseClient();
  const [{ data: discoveries }, { data: squarePosts }] = await Promise.all([
    client.from('discoveries').select('*').order('created_at', { ascending: false }).limit(100),
    client.from('square_posts').select('*').order('created_at', { ascending: false }).limit(100),
  ]);
  const commercialDiscoveries = (discoveries ?? []).filter(
    (d) => d.commercial || d.commission != null || d.promo_type != null
  );
  const productPosts = (squarePosts ?? []).filter((p) => p.url);

  // 联表用户名
  const userIds = new Set<string>();
  for (const x of commercialDiscoveries) if (x.author_id) userIds.add(x.author_id);
  for (const x of productPosts) if (x.author_id) userIds.add(x.author_id);
  const userNames: Record<string, string> = {};
  if (userIds.size) {
    const { data: users } = await client.from('users').select('id,name').in('id', Array.from(userIds));
    for (const u of users ?? []) userNames[u.id] = u.name ?? '';
  }

  const rows: ProductItem[] = [
    ...commercialDiscoveries.map((x) => ({
      source: 'discovery' as const,
      id: x.id,
      title: x.note || x.title || x.description || '未命名商品',
      kind: x.type || '商业推广',
      commercial: !!x.commercial,
      commission: x.commission != null ? x.commission : null,
      promoType: x.promo_type || '',
      url: x.url || '',
      status: (x.reason ? '下架' : '上架') as ProductStatus,
      authorName: userNames[x.author_id ?? ''] || '用户',
      createdAt: x.created_at,
      reason: x.reason,
    })),
    ...productPosts.map((x) => ({
      source: 'square' as const,
      id: x.id,
      title: x.content || '未命名帖子',
      kind: x.category || '帖子',
      commercial: false,
      commission: null,
      promoType: '',
      url: x.url || '',
      status: (x.url_status === 'blocked' ? '下架' : '上架') as ProductStatus,
      authorName: userNames[x.author_id ?? ''] || '用户',
      createdAt: x.created_at,
      reason: x.url_status,
    })),
  ];

  const riskHigh =
    commercialDiscoveries.filter((d) => !!d.reason).length +
    productPosts.filter((p) => p.url_status === 'blocked').length;

  return {
    rows,
    stats: {
      total: rows.length,
      commercial: commercialDiscoveries.length,
      linked: productPosts.length,
      riskHigh,
    },
  };
}

export interface ProductEditInput {
  source: ProductSource;
  id: string;
  title: string;
  kind?: string;
  commission?: string | number | null;
  promoType?: string;
  url?: string;
  commercial?: boolean;
  status: ProductStatus;
}

/** 编辑商品：按 source 精确更新对应表字段（不越界写列） */
export async function applyProductEdit(input: ProductEditInput): Promise<void> {
  const client = getSupabaseClient();
  const { source, id, title, kind, commission, promoType, url, commercial, status } = input;

  if (source === 'discovery') {
    const patch: Partial<Pick<DiscoveriesRow, 'title' | 'note' | 'type' | 'commission' | 'promo_type' | 'url' | 'commercial' | 'reason'>> = {};
    if (title.trim()) { patch.title = title.trim(); patch.note = title.trim(); }
    if (kind?.trim()) patch.type = kind.trim();
    if (commission !== undefined) patch.commission = commission === '' || commission === null ? null : String(commission);
    if (promoType !== undefined) patch.promo_type = promoType;
    if (url !== undefined) patch.url = url;
    if (typeof commercial === 'boolean') patch.commercial = commercial;
    patch.reason = status === '下架' ? '管理员下架' : null;
    const { error } = await client.from('discoveries').update(patch).eq('id', id);
    if (error) throw new Error(`applyProductEdit failed: ${error.message}`);
  } else {
    const patch: Partial<Pick<SquarePostsRow, 'content' | 'category' | 'commission' | 'url' | 'url_status'>> = {};
    if (title.trim()) patch.content = title.trim();
    if (kind?.trim()) patch.category = kind.trim();
    if (commission !== undefined) patch.commission = commission === '' || commission === null ? null : String(commission);
    if (url !== undefined) patch.url = url;
    patch.url_status = status === '下架' ? 'blocked' : 'normal';
    const { error } = await client.from('square_posts').update(patch).eq('id', id);
    if (error) throw new Error(`applyProductEdit failed: ${error.message}`);
  }
}

/** 删除商品：真删主库对应行 */
export async function deleteProduct(source: ProductSource, id: string): Promise<void> {
  const table = source === 'square' ? 'square_posts' : 'discoveries';
  const { error } = await getSupabaseClient().from(table).delete().eq('id', id);
  if (error) throw new Error(`deleteProduct failed: ${error.message}`);
}
