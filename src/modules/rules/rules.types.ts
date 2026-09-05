// 规则与处罚模块：领域类型定义。
// 字段与前端 ViolationsList / DomainManager 期望完全一致（与旧 rule-repo 的
// RuleData 同形，保持结构兼容，不改动任何组件）。
import type { LinkDomainsRow, UrlAuditRow } from '@/lib/db-types';

/** 域名规则 + 违规记录 DTO（与旧 rule-repo.RuleData 完全一致） */
export interface RuleData {
  domains: LinkDomainsRow[];
  violations: UrlAuditRow[];
  userNames: Record<string, string>;
}