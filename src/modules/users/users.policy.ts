// 用户治理模块：资源授权策略。
// 复用 @/lib/auth/policy 统一 requirePermission，按动作映射细分权限。
import { requirePermission } from '@/lib/auth/policy';
import { Permissions } from '@/lib/auth/permissions';

/** 读取用户列表 / 治理详情：要求 user.read */
export function requireUserRead() {
  return requirePermission(Permissions.userRead);
}

/** 编辑基础资料 / 角色调整：要求 user.edit */
export function requireUserEdit() {
  return requirePermission(Permissions.userEdit);
}

/** 治理动作（封禁/限流/恢复）：要求 user.ban */
export function requireUserBan() {
  return requirePermission(Permissions.userBan);
}