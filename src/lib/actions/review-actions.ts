// 内容审核 Server Actions：通过 / 驳回 / 批量（'use server' 文件）
'use server';

import { revalidatePath } from 'next/cache';
import { AuthError } from '@/lib/auth/errors';
import { reviewActionSchema, type ReviewActionInput, reviewItem, batchReviewItems } from '@/modules/content-review';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function toError(e: unknown): string {
  if (e instanceof AuthError) return e.message;
  return e instanceof Error ? e.message : String(e);
}

/** 单条审核（通过 / 驳回）：授权 + 校验 + 写库委托模块命令层 */
export async function reviewContent(input: ReviewActionInput): Promise<ActionResult> {
  try {
    const parsed = reviewActionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '输入不合法' };
    // 命中的命令内部做 review.apply 授权并写库
    await reviewItem(parsed.data);
    revalidatePath('/content-review');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}

/** 批量审核：授权 + 批量校验 + 顺序写库均委托模块命令层 */
export async function batchReviewContent(inputs: ReviewActionInput[]): Promise<ActionResult> {
  try {
    await batchReviewItems(inputs);
    revalidatePath('/content-review');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}