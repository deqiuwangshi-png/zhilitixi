// 商品治理模块：命令层（写操作）。
// 授权 → zod 校验 → 落库，失败抛稳定 AuthError（不暴露 Supabase 原始错误）。
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
import {
  applyProductEdit as repoApplyProductEdit,
  deleteProduct as repoDeleteProduct,
} from '@/lib/repos/product-repo';
import { requireProductManage } from './product-gov.policy';
import {
  productDeleteSchema,
  productEditSchema,
  type ProductDeleteInput,
  type ProductEditInput,
} from './product-gov.schema';

/** 编辑 / 下架商品：product.manage + 校验 + 复用既有仓库更新逻辑 */
export async function applyProductEdit(input: ProductEditInput): Promise<void> {
  await requireProductManage();
  const parsed = productEditSchema.safeParse(input);
  if (!parsed.success) {
    throw new AuthError(
      AUTH_ERROR_CODES.VALIDATION_FAILED,
      parsed.error.issues[0]?.message ?? '商品输入不合法'
    );
  }
  await repoApplyProductEdit(parsed.data);
}

/** 删除商品（真删）：product.manage + 校验 + 复用既有仓库删除逻辑 */
export async function deleteProduct(input: ProductDeleteInput): Promise<void> {
  await requireProductManage();
  const parsed = productDeleteSchema.safeParse(input);
  if (!parsed.success) {
    throw new AuthError(
      AUTH_ERROR_CODES.VALIDATION_FAILED,
      parsed.error.issues[0]?.message ?? '删除商品输入不合法'
    );
  }
  await repoDeleteProduct(parsed.data.source, parsed.data.id);
}