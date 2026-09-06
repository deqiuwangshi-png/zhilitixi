// 内容审核模块：Server Actions（唯一写入口：单条通过/驳回 + 批量）。
// 注意：'use server' 文件只能导出 async 函数，类型定义必须放在 content-review.types / content-review.schema。
'use server';

import { revalidatePath } from 'next/cache';
import { AuthError } from '@/lib/auth/errors';
import { withRequestId } from '@/lib/request-context';
import { reviewActionSchema, type ReviewActionInput } from './content-review.schema';
import { reviewItem, batchReviewItems } from './content-review.commands';

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** 入口统一生成的请求 id：失败时供客户端上报排查，与审计日志对齐 */
  requestId?: string;
}

function toError(e: unknown): string {
  if (e instanceof AuthError) return e.message;
  return e instanceof Error ? e.message : String(e);
}

/** 单条审核（通过 / 驳回）：授权 + 校验 + 写库委托模块命令层 */
export async function reviewContent(input: ReviewActionInput): Promise<ActionResult> {
  return withRequestId(async (requestId) => {
    try {
      const parsed = reviewActionSchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '输入不合法', requestId };
      // 命中的命令内部做 review.apply 授权并写库
      await reviewItem(parsed.data);
      revalidatePath('/content-review');
      return { ok: true, requestId };
    } catch (e) {
      return { ok: false, error: toError(e), requestId };
    }
  });
}

/** 批量审核：授权 + 批量校验 + 顺序写库均委托模块命令层 */
export async function batchReviewContent(inputs: ReviewActionInput[]): Promise<ActionResult> {
  return withRequestId(async (requestId) => {
    try {
      await batchReviewItems(inputs);
      revalidatePath('/content-review');
      return { ok: true, requestId };
    } catch (e) {
      return { ok: false, error: toError(e), requestId };
    }
  });
}
