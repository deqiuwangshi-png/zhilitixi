// 活动上架模块：资源授权策略。
// 复用 @/lib/auth/policy 统一 requirePermission，按动作映射细分权限。
import { requirePermission } from '@/lib/auth/policy';
import { Permissions } from '@/lib/auth/permissions';

/** 读取活动列表 / 统计：要求 activity.read */
export function requireActivityRead() {
  return requirePermission(Permissions.activityRead);
}

/** 活动写操作（新增/编辑/上架下架/删除）：要求 activity.manage */
export function requireActivityManage() {
  return requirePermission(Permissions.activityManage);
}