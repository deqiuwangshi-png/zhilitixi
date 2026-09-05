// 风控中心模块：领域类型定义。
// 字段与前端 RiskStats / RiskClient 期望完全一致（urlAudits/domains/uploadAudits 使用
// db-types 裸行，userNames 为对象映射，保持结构兼容，不改动任何组件）。
import type { LinkDomainsRow, UploadAuditRow, UrlAuditRow } from '@/lib/db-types';

/** 风控 tab（URL 参数驱动） */
export type RiskTab = 'url' | 'domain' | 'upload';

/** 风控列表查询条件（domain tab 为 DB 分页检索；url/upload 全量展示） */
export interface RiskListQuery {
  tab?: string;
  q?: string;
  page: number;
  pageSize: number;
}

/** 分页结果通用结构 */
export interface RiskPageResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 顶部统计所需三数据源（与旧 risk-repo.RiskData 同形 + 分页态） */
export interface RiskListData {
  urlAudits: UrlAuditRow[];
  /** 全量域名（供顶部“黑名单域名”统计；与旧 RiskData 同构） */
  domains: LinkDomainsRow[];
  uploadAudits: UploadAuditRow[];
  userNames: Record<string, string>;
  /** domain tab 当页行（DB 分页结果，避免内存切片） */
  pageDomains: LinkDomainsRow[];
  page: number;
  totalPages: number;
}