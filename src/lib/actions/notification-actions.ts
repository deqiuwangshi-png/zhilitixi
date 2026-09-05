// 消息通知 Server Actions（'use server' 文件）
'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { withRequestId } from '@/lib/request-context';
import { markNotificationRead, markAllNotificationsRead } from '@/lib/repos/notification-repo';
import { notificationReadSchema, type NotificationReadInput } from '@/lib/validations/notification.schema';

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** 入口统一生成的请求 id：失败时供客户端上报排查，与审计日志对齐 */
  requestId?: string;
}

function toError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 单条标记已读 */
export async function markRead(input: NotificationReadInput): Promise<ActionResult> {
  return withRequestId(async (requestId) => {
    try {
      await requireAdmin();
      const parsed = notificationReadSchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '输入不合法', requestId };
      await markNotificationRead(parsed.data.id);
      revalidatePath('/');
      return { ok: true, requestId };
    } catch (e) {
      return { ok: false, error: toError(e), requestId };
    }
  });
}

/** 当前管理员全部标记已读 */
export async function markAllRead(): Promise<ActionResult> {
  return withRequestId(async (requestId) => {
    try {
      const admin = await requireAdmin();
      await markAllNotificationsRead(admin.userId);
      revalidatePath('/');
      return { ok: true, requestId };
    } catch (e) {
      return { ok: false, error: toError(e), requestId };
    }
  });
}
