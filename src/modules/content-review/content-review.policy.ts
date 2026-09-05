// 内容审核模块：资源授权策略。
// 复用 @/lib/auth/policy 统一 requirePermission，内容审核统一使用 review.apply。
import { requirePermission } from '@/lib/auth/policy';
import { Permissions } from '@/lib/auth/permissions';

/**
 * 内容审核（通过 / 驳回 / 批量）：统一要求 review.apply。
 * 当前权限模型仅注册了 review.apply；无独立只读权限时，读列表同样要求该权限。
 */
export function requireReviewApply() {
  return requirePermission(Permissions.reviewApply);
}