// 消息通知模块：行归一化映射（裸行 → DTO，字段与 NotificationItem 完全一致）。
import type { NotificationItem, NotificationRowData } from './notification.types';

/** 单个裸行 → NotificationItem DTO（布尔与时间字段收敛，保持前端组件期望结构） */
export function rowToDto(n: NotificationRowData): NotificationItem {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    content: n.content,
    read: !!n.read,
    createdAt: n.created_at,
  };
}
