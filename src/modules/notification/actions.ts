// 消息通知模块：Server Actions（唯一写入口）。
// 注意：'use server' 文件只能导出 async 函数，类型定义必须放在 notification.types / notification.schema。
'use server';

import { revalidatePath } from 'next/cache';
import { withRequestId } from '@/lib/request-context';
import { markNotificationRead, markAllNotificationsRead } from './notification.commands';
import type { NotificationReadInput } from './notification.schema';

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
      await markNotificationRead(input);
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
      await markAllNotificationsRead();
      revalidatePath('/');
      return { ok: true, requestId };
    } catch (e) {
      return { ok: false, error: toError(e), requestId };
    }
  });
}
