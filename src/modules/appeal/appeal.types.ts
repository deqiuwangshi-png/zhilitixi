// 侵权与申诉模块：领域类型定义。
// 字段与前端 AppealHeader / AppealClient 期望完全一致（域内自包含，不依赖外部）。
import type { AppealCatalogViewRow } from '@/lib/db-types';

/** 申诉来源（discoveries / square_posts） */
export type AppealSource = 'discovery' | 'square';

/** 申诉状态（目前无独立状态存储，全部为待复核） */
export type AppealStatus = 'needs_review';

/** 申诉案件行 DTO */
export interface AppealItem {
  source: AppealSource;
  id: string;
  title: string;
  reason: string | null;
  url: string | null;
  content: string | null;
  note: string | null;
  description: string | null;
  authorName: string;
  /** 目前无状态存储，全部为待复核；resolved/dismissed tab 显示空态 */
  status: AppealStatus;
}

/** 联合视图（v_appeal_catalog）返回的裸行 */
export type AppealRowData = AppealCatalogViewRow;

/** 申诉列表查询条件（当前为全量队列展示；分页能力预留） */
export interface AppealListQuery {
  tab?: string;
  page: number;
  pageSize: number;
}

/** 分页结果通用结构（queries 当前返回全量 + total，结构保持通用） */
export interface AppealPageResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}