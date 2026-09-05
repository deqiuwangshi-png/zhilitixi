// 治理总览模块：资源授权策略。
// 复用 @/lib/auth/policy 统一 requirePermission。总览为纯只读统计页，仅需 overview.read。
import { requirePermission } from '@/lib/auth/policy';
import { Permissions } from '@/lib/auth/permissions';

/** 读取治理总览：要求 overview.read */
export function requireOverviewRead() {
  return requirePermission(Permissions.overviewRead);
}