// 活动上架 Server Actions（'use server' 文件）
'use server';

import { revalidatePath } from 'next/cache';
import { saveActivity, toggleActivity, removeActivity, type ActivitySaveInput } from '@/modules/activity';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function toError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 新增 / 更新活动 */
export async function saveActivityAction(input: ActivitySaveInput): Promise<ActionResult> {
  try {
    await saveActivity(input);
    revalidatePath('/activity');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}

/** 上架 / 下架 */
export async function toggleActivityAction(input: { id: string; active: boolean }): Promise<ActionResult> {
  try {
    await toggleActivity(input);
    revalidatePath('/activity');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}

/** 删除活动 */
export async function removeActivityAction(input: { id: string }): Promise<ActionResult> {
  try {
    await removeActivity(input);
    revalidatePath('/activity');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}