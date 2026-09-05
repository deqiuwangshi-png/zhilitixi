// 活动上架模块：行归一化映射（从旧 activity-repo 迁移，字段与 ActivityItem / AnnouncementsRow 完全一致）。
import type { ActivityItem, ActivityRowData } from './activity.types';

/** 单个裸行 → ActivityItem DTO（空值收敛为默认值，保持前端组件期望的结构） */
export function rowToDto(r: ActivityRowData): ActivityItem {
  return {
    id: r.id,
    kind: r.kind ?? '',
    icon: r.icon ?? 'spark',
    title: r.title ?? '',
    description: r.description ?? '',
    link: r.link ?? '',
    image_url: r.image_url ?? '',
    sort: r.sort ?? 0,
    active: !!r.active,
    starts_at: r.starts_at ?? null,
    ends_at: r.ends_at ?? null,
    created_at: r.created_at ?? null,
  };
}