// 商品治理仓储层：商业化内容合并列表 + 编辑/删除写操作。
// TODO: 模块化迁移至 src/modules/product-gov（查询走 `listProducts` / `getProductStats`，
// 写操作经 commands 复用本文件的 applyProductEdit/deleteProduct）。以下导出保留供旧引用兼容。
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import type { DiscoveriesRow, SquarePostsRow } from '@/lib/db-types';
import type { ProductItem, ProductSource, ProductStatus, ProductStats } from '@/modules/product-gov';

// 类型单一来源 = modules/product-gov（与旧定义同形，结构兼容）。
export type { ProductItem, ProductSource, ProductStatus, ProductStats };

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
  const client = getSupabasePrivilegedClient();
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
  const { error } = await getSupabasePrivilegedClient().from(table).delete().eq('id', id);
  if (error) throw new Error(`deleteProduct failed: ${error.message}`);
}
