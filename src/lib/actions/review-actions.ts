// 内容审核 Server Actions：通过 / 驳回 / 批量（'use server' 文件）
'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { applyReview } from '@/lib/repos/content-repo';
import { reviewActionSchema, type ReviewActionInput } from '@/lib/validations/review.schema';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function toError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 单条审核（通过 / 驳回） */
export async function reviewContent(input: ReviewActionInput): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = reviewActionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '输入不合法' };
    await applyReview(parsed.data);
    revalidatePath('/content-review');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}

/** 批量审核 */
export async function batchReviewContent(inputs: ReviewActionInput[]): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (!Array.isArray(inputs) || inputs.length === 0) return { ok: false, error: '未选择任何内容' };
    const parsed = inputs.map((i) => reviewActionSchema.parse(i));
    await Promise.all(parsed.map((i) => applyReview(i)));
    revalidatePath('/content-review');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}
