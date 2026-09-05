// 商品治理 Server Actions（'use server' 文件）
'use server';

import { revalidatePath } from 'next/cache';
import {
  applyProductEdit,
  deleteProduct,
  type ProductEditInput,
  type ProductDeleteInput,
} from '@/modules/product-gov';

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
    await applyProductEdit(input);
    revalidatePath('/product-gov');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}

/** 删除商品（真删） */
export async function removeProduct(input: ProductDeleteInput): Promise<ActionResult> {
  try {
    await deleteProduct(input);
    revalidatePath('/product-gov');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}