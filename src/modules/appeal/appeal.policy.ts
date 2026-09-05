// 侵权与申诉模块：资源授权策略。
// 复用 @/lib/auth/policy 统一 requirePermission，按动作映射细分权限。
import { requirePermission } from '@/lib/auth/policy';
import { Permissions } from '@/lib/auth/permissions';

/** 读取申诉案件队列：要求 appeal.read */
export function requireAppealRead() {
  return requirePermission(Permissions.appealRead);
}

/** 处理申诉（恢复发布 / 维持处罚）：要求 appeal.manage */
export function requireAppealManage() {
  return requirePermission(Permissions.appealManage);
}