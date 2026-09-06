// 商品治理模块：Server Actions（唯一写入口）。
// 注意：'use server' 文件只能导出 async 函数，类型定义必须放在 product-gov.types / schema。
'use server';

import { revalidatePath } from 'next/cache';
import { withRequestId } from '@/lib/request-context';
import { applyProductEdit, deleteProduct } from './product-gov.commands';
import type { ProductEditInput, ProductDeleteInput } from './product-gov.schema';

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** 入口统一生成的请求 id：失败时供客户端上报排查，与审计日志对齐 */
  requestId?: string;
}

function toError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 保存商品编辑 */
export async function saveProduct(input: ProductEditInput): Promise<ActionResult> {
  return withRequestId(async (requestId) => {
    try {
      await applyProductEdit(input);
      revalidatePath('/product-gov');
      return { ok: true, requestId };
    } catch (e) {
      return { ok: false, error: toError(e), requestId };
    }
  });
}

/** 删除商品（真删） */
export async function removeProduct(input: ProductDeleteInput): Promise<ActionResult> {
  return withRequestId(async (requestId) => {
    try {
      await deleteProduct(input);
      revalidatePath('/product-gov');
      return { ok: true, requestId };
    } catch (e) {
      return { ok: false, error: toError(e), requestId };
    }
  });
}
