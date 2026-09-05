// 举报处理模块：领域类型定义。
// 字段与前端 ReportClient 期望完全一致（id/reportNo/status/contentType/reason/
// reporterName/targetName/targetId/repeatCount/createdAt），不得改动。
import type { ReportsRow } from '@/lib/db-types';

/** 归一化后的举报状态（数据库多态状态收敛为三类） */
export type ReportStatus = 'pending' | 'approved' | 'rejected';

/** 举报处理动作（写操作入参） */
export type ReportAction = 'approve' | 'reject';

/** 举报列表行 DTO */
export interface ReportItem {
  id: string;
  reportNo: string;
  status: ReportStatus;
  contentType: string;
  reason: string;
  reporterName: string;
  targetName: string;
  targetId: string | null;
  repeatCount: number;
  createdAt: string | null;
}

/** 举报列表筛选 + 分页查询条件（服务端构造，数据库分页筛选） */
export interface ReportListQuery {
  page: number;
  pageSize: number;
  status?: string;
  type?: string;
  reason?: string;
  repeat?: boolean;
  q?: string;
}

/** 分页结果通用结构 */
export interface ReportPageResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* ---- reportNo 生成 / contentType / reason 归一化所需类型 ---- */

/** 生成举报编号的函数签名（index 为当前页内序号） */
export type ReportNoFn = (createdAt: string | null | undefined, index: number) => string;

/** 内容类型归一化：原始 target_type → 中文文案 */
export type ContentTypeFn = (raw: string) => string;

/** 举报理由归一化：原始 reason → 中文文案 */
export type ReasonFn = (raw: string) => string;

/** 状态归一化：数据库多态状态 → ReportStatus */
export type StatusFn = (raw: string | null | undefined) => ReportStatus;

/** 行归一化的上下文（由 queries 在页内构建后传入，减少重复查询） */
export interface RowToDtoContext {
  /** reporter_id / 被举报用户 id → 用户名 */
  userNames?: Record<string, string>;
  /** target_id → 该目标在本批数据中的重复次数 */
  repeatMap?: Record<string, number>;
}

/** ReportsRow 所需子集（与 queries 投影字段一致） */
export type ReportListRow = Pick<
  ReportsRow,
  'id' | 'reporter_id' | 'target_type' | 'target_id' | 'reason' | 'status' | 'created_at'
>;