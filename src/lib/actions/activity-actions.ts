// 活动上架 Server Actions（'use server' 文件）
'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { saveActivity, toggleActivity, deleteActivity } from '@/lib/repos/activity-repo';
import {
  activitySaveSchema,
  activityToggleSchema,
  activityDeleteSchema,
  type ActivitySaveInput,
} from '@/lib/validations/activity.schema';

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
    await requireAdmin();
    const parsed = activitySaveSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '输入不合法' };
    await saveActivity(parsed.data);
    revalidatePath('/activity');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}

/** 上架 / 下架 */
export async function toggleActivityAction(input: { id: string; active: boolean }): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = activityToggleSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '输入不合法' };
    await toggleActivity(parsed.data.id, parsed.data.active);
    revalidatePath('/activity');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}

/** 删除活动 */
export async function removeActivityAction(input: { id: string }): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = activityDeleteSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '输入不合法' };
    await deleteActivity(parsed.data.id);
    revalidatePath('/activity');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}
