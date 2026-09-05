// 侵权与申诉 Server Actions（'use server' 文件）
'use server';

import { revalidatePath } from 'next/cache';
import { applyAppeal, type AppealActionInput } from '@/modules/appeal';

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
    await applyAppeal(input);
    revalidatePath('/infringement');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}
