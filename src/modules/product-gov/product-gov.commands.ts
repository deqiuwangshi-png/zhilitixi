// 商品治理模块：命令层（写操作）。
// 授权 → zod 校验 → 落库（service-role），失败抛稳定 AuthError（不暴露 Supabase 原始错误）。
// 编辑按 source 精确更新对应表字段（不越界写列）；删除真删主库对应行。
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import type { DiscoveriesRow, SquarePostsRow } from '@/lib/db-types';
import { requireProductManage } from './product-gov.policy';
import {
  productDeleteSchema,
  productEditSchema,
  type ProductDeleteInput,
  type ProductEditInput,
} from './product-gov.schema';

/** 编辑 / 下架商品：product.manage + 校验 + 按 source 精确更新对应表字段 */
export async function applyProductEdit(input: ProductEditInput): Promise<void> {
  await requireProductManage();
  const parsed = productEditSchema.safeParse(input);
  if (!parsed.success) {
    throw new AuthError(
      AUTH_ERROR_CODES.VALIDATION_FAILED,
      parsed.error.issues[0]?.message ?? '商品输入不合法',
    );
  }

  const client = getSupabasePrivilegedClient();
  const { source, id, title, kind, commission, promoType, url, commercial, status } = parsed.data;
  try {
    if (source === 'discovery') {
      const patch: Partial<Pick<DiscoveriesRow, 'title' | 'note' | 'type' | 'commission' | 'promo_type' | 'url' | 'commercial' | 'reason'>> = {};
      if (title.trim()) {
        patch.title = title.trim();
        patch.note = title.trim();
      }
      if (kind?.trim()) patch.type = kind.trim();
      if (commission !== undefined)
        patch.commission = commission === '' || commission === null ? null : String(commission);
      if (promoType !== undefined) patch.promo_type = promoType;
      if (url !== undefined) patch.url = url;
      if (typeof commercial === 'boolean') patch.commercial = commercial;
      patch.reason = status === '下架' ? '管理员下架' : null;
      const { error } = await client.from('discoveries').update(patch).eq('id', id);
      if (error) throw new Error(error.message);
    } else {
      const patch: Partial<Pick<SquarePostsRow, 'content' | 'category' | 'commission' | 'url' | 'url_status'>> = {};
      if (title.trim()) patch.content = title.trim();
      if (kind?.trim()) patch.category = kind.trim();
      if (commission !== undefined)
        patch.commission = commission === '' || commission === null ? null : String(commission);
      if (url !== undefined) patch.url = url;
      patch.url_status = status === '下架' ? 'blocked' : 'normal';
      const { error } = await client.from('square_posts').update(patch).eq('id', id);
      if (error) throw new Error(error.message);
    }
  } catch (err) {
    console.error('[product-gov] applyProductEdit failed:', err instanceof Error ? err.message : err);
    throw new AuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, '商品保存失败，请稍后重试');
  }
}

/** 删除商品（真删主库对应行）：product.manage + 校验 */
export async function deleteProduct(input: ProductDeleteInput): Promise<void> {
  await requireProductManage();
  const parsed = productDeleteSchema.safeParse(input);
  if (!parsed.success) {
    throw new AuthError(
      AUTH_ERROR_CODES.VALIDATION_FAILED,
      parsed.error.issues[0]?.message ?? '删除商品输入不合法',
    );
  }

  const table = parsed.data.source === 'square' ? 'square_posts' : 'discoveries';
  try {
    const { error } = await getSupabasePrivilegedClient().from(table).delete().eq('id', parsed.data.id);
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error('[product-gov] deleteProduct failed:', err instanceof Error ? err.message : err);
    throw new AuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, '商品删除失败，请稍后重试');
  }
}
