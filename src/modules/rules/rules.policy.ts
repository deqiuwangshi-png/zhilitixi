// 规则与处罚模块：资源授权策略。
// 复用 @/lib/auth/policy 统一 requirePermission。规则页（域名规则 + 违规记录）为
// 读写一体，复用既有 rule.manage 权限点，无独立 read/manage 拆分。
import { requirePermission } from '@/lib/auth/policy';
import { Permissions } from '@/lib/auth/permissions';

/** 读取 / 管理域名规则与违规记录：要求 rule.manage */
export function requireRuleManage() {
  return requirePermission(Permissions.ruleManage);
}