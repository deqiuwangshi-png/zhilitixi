// 举报处理模块：资源授权策略。
// 复用 @/lib/auth/policy 统一 requirePermission，按动作映射细分权限。
import { requirePermission } from '@/lib/auth/policy';
import { Permissions } from '@/lib/auth/permissions';
import type { ReportAction } from './report.types';

/** 读取举报列表：要求 report.read */
export function requireReportRead() {
  return requirePermission(Permissions.reportRead);
}

/** 处理举报：approve→report.approve / reject→report.reject */
export function requireReportModerate(action: ReportAction) {
  return requirePermission(
    action === 'approve' ? Permissions.reportApprove : Permissions.reportReject,
  );
}