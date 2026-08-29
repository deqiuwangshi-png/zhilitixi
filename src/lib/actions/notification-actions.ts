// 消息通知 Server Actions（'use server' 文件）
'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { markNotificationRead, markAllNotificationsRead } from '@/lib/repos/notification-repo';
import { notificationReadSchema, type NotificationReadInput } from '@/lib/validations/notification.schema';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function toError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 单条标记已读 */
export async function markRead(input: NotificationReadInput): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = notificationReadSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '输入不合法' };
    await markNotificationRead(parsed.data.id);
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}

/** 当前管理员全部标记已读 */
export async function markAllRead(): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    await markAllNotificationsRead(admin.userId);
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}
