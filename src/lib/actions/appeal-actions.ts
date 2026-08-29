// 侵权与申诉 Server Actions（'use server' 文件）
'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { applyAppealAction } from '@/lib/repos/appeal-repo';
import { appealActionSchema, type AppealActionInput } from '@/lib/validations/appeal.schema';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function toError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 申诉处理（恢复发布 / 维持处罚） */
export async function handleAppeal(input: AppealActionInput): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = appealActionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '输入不合法' };
    await applyAppealAction(parsed.data.source, parsed.data.id, parsed.data.action);
    revalidatePath('/infringement');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}
