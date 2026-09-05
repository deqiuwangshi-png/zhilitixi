// 风控中心模块：资源授权策略。
// 复用 @/lib/auth/policy 统一 requirePermission，按动作映射细分权限。
import { requirePermission } from '@/lib/auth/policy';
import { Permissions } from '@/lib/auth/permissions';

/** 读取风控中心（URL 巡检 / 域名黑名单 / 上传审核）：要求 risk.read */
export function requireRiskRead() {
  return requirePermission(Permissions.riskRead);
}

/** 风控操作（域名增删/切换、URL 放行封禁删除、上传审核）：要求 risk.manage */
export function requireRiskManage() {
  return requirePermission(Permissions.riskManage);
}