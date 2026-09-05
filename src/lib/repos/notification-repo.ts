// 消息通知仓储层：当前用户通知列表 + 已读操作（notifications 表）。
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import { getSessionRlsClient } from '@/lib/auth/session-client';

export interface NotificationItem {
  id: string;
  type: string | null;
  title: string | null;
  content: string | null;
  read: boolean;
  createdAt: string | null;
}

/** 当前用户通知列表（未读优先，最多 20 条） */
export async function listNotifications(userId: string): Promise<NotificationItem[]> {
  // 读取走 RLS 用户客户端（当前请求 token）；notifications 表 011 已启用 RLS（本人读 / 管理员读），
  // 此处按 userId 过滤与 RLS 双重收敛，service-role 仅保留写路径。
  const client = await getSessionRlsClient();
  const { data, error } = await client
    .from('notifications')
    .select('id,type,title,content,read,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw new Error(`listNotifications failed: ${error.message}`);
  return (data ?? []).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    content: n.content,
    read: !!n.read,
    createdAt: n.created_at,
  }));
}

/** 单条标记已读 */
export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await getSupabasePrivilegedClient()
    .from('notifications')
    .update({ read: true })
    .eq('id', id);
  if (error) throw new Error(`markNotificationRead failed: ${error.message}`);
}

/** 当前用户全部标记已读 */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await getSupabasePrivilegedClient()
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw new Error(`markAllNotificationsRead failed: ${error.message}`);
}
