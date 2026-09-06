// 消息通知模块：查询层（数据访问，只读）。
// 顶栏面板为「最近通知」预览，天然有界（20 条）；如需全量分页再扩展 count+range，
// 勿在此扩成全表拉取。读取走 RLS 用户客户端；notifications 表已启用 RLS（本人读 / 管理员读）。
import { getSessionRlsClient } from '@/lib/auth/session-client';
import { rowToDto } from './notification.mapper';
import type { NotificationItem, NotificationRowData } from './notification.types';

/** listNotifications 的 select 投影列（与 NotificationRowData 对应） */
const LIST_COLS = 'id,type,title,content,read,created_at';

/**
 * 当前用户通知列表（未读优先，最近 20 条有界预览）。
 * 传 userId 由调用方（layout 已 requireAdmin）提供，按 user_id 过滤与 RLS 双重收敛。
 * 查询异常不抛出（顶栏通知异常不阻断布局），仅记录日志并返回空列表。
 */
export async function listNotifications(userId: string): Promise<NotificationItem[]> {
  const client = await getSessionRlsClient();
  const { data, error } = await client
    .from('notifications')
    .select(LIST_COLS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error(`[notification] listNotifications failed:`, error.message);
    return [];
  }
  return ((data ?? []) as NotificationRowData[]).map(rowToDto);
}
