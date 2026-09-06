// 消息通知模块：命令层（写操作）。
// 授权 → zod 校验 → 落库，失败抛稳定 AuthError（不暴露 Supabase 原始错误）。
// 本域通知为「管理员本人站内信」，写操作一律带 user_id=当前管理员 过滤，杜绝越权标记他人。
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
import { notificationReadSchema } from './notification.schema';
import { requireNotificationAccess } from './notification.policy';

/** 落库失败统一转稳定错误，原始信息只落日志不外抛 */
function fail(step: string, err: unknown): never {
  console.error(`[notification] ${step} failed:`, err instanceof Error ? err.message : err);
  throw new AuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, '通知操作失败，请稍后重试');
}

/** 单条标记已读：管理员本人 + 校验 + 落库 */
export async function markNotificationRead(input: { id: string }): Promise<void> {
  const admin = await requireNotificationAccess();
  const parsed = notificationReadSchema.safeParse(input);
  if (!parsed.success) {
    throw new AuthError(
      AUTH_ERROR_CODES.VALIDATION_FAILED,
      parsed.error.issues[0]?.message ?? '通知输入不合法'
    );
  }

  const { error } = await getSupabasePrivilegedClient()
    .from('notifications')
    .update({ read: true })
    .eq('id', parsed.data.id)
    .eq('user_id', admin.userId);
  if (error) fail('markNotificationRead', error);
}

/** 当前管理员全部标记已读：本人范围 + 落库 */
export async function markAllNotificationsRead(): Promise<void> {
  const admin = await requireNotificationAccess();

  const { error } = await getSupabasePrivilegedClient()
    .from('notifications')
    .update({ read: true })
    .eq('user_id', admin.userId)
    .eq('read', false);
  if (error) fail('markAllNotificationsRead', error);
}
