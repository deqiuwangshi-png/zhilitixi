// 商品治理 Server Actions（'use server' 文件）
'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { applyProductEdit, deleteProduct } from '@/lib/repos/product-repo';
import { productEditSchema, productDeleteSchema, type ProductEditInput, type ProductDeleteInput } from '@/lib/validations/product.schema';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function toError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 保存商品编辑 */
export async function saveProduct(input: ProductEditInput): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = productEditSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '输入不合法' };
    await applyProductEdit(parsed.data);
    revalidatePath('/product-gov');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}

/** 删除商品（真删） */
export async function removeProduct(input: ProductDeleteInput): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = productDeleteSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '输入不合法' };
    await deleteProduct(parsed.data.source, parsed.data.id);
    revalidatePath('/product-gov');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}
