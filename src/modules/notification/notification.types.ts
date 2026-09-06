// 消息通知模块：领域类型定义。
// 字段与顶栏 NotificationPanel / DashboardHeader 期望完全一致
// （与 notifications 表行兼容，保持结构不变，不改动任何组件）。
import type { NotificationsRow } from '@/lib/db-types';

/** 顶栏通知条目 DTO（与 NotificationsRow 同形，结构兼容） */
export interface NotificationItem {
  id: string;
  type: string | null;
  title: string | null;
  content: string | null;
  read: boolean;
  createdAt: string | null;
}

/** listNotifications 所选列对应的裸行（即 notifications 表行） */
export type NotificationRowData = Pick<
  NotificationsRow,
  'id' | 'type' | 'title' | 'content' | 'read' | 'created_at'
>;
