// 活动上架模块：领域类型定义。
// 字段与前端 ActivityStats / ActivityClient / ActivityDrawer 期望完全一致
// （与 AnnouncementsRow 保持一致结构，不改动任何组件）。
import type { AnnouncementsRow } from '@/lib/db-types';

/** 活动类型 */
export type ActivityKind = 'activity' | 'notice' | 'banner';

/** 活动列表行 DTO（与 AnnouncementsRow 同形，保持结构兼容） */
export interface ActivityItem {
  id: string;
  kind: string;
  icon: string;
  title: string;
  description: string;
  link: string;
  image_url: string;
  sort: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string | null;
}

/** listActivities 所选列对应的裸行（即 announcements 表行） */
export type ActivityRowData = AnnouncementsRow;

/** 活动列表筛选 + 分页查询条件（服务端构造，数据库分页筛选） */
export interface ActivityListQuery {
  page: number;
  pageSize: number;
  kind?: string;
  q?: string;
}

/** 分页结果通用结构 */
export interface ActivityPageResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 顶部统计卡数据（数据库全量 count，杜绝基于有界列表的内存统计少算） */
export interface ActivityStatsData {
  total: number;
  active: number;
}