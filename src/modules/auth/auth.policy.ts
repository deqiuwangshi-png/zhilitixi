// 认证会话域：资源授权策略。
// 会话 / 个人资料 / 改密属「当前登录管理员本人」操作——能登录后台即为管理员，
// 无需治理他人的细粒度权限（原 /api/auth/me 借用 user.read/user.edit 语义不合理）。
// 与 notification 同型：薄封装 requireAdmin，返回 CurrentAdmin 供本人数据过滤。
import { requireAdmin } from '@/lib/auth';
import type { CurrentAdmin } from '@/lib/auth';

/** 会话 / 资料 / 改密访问：仅要求已登录管理员（本人操作） */
export function requireAuthAccess(): Promise<CurrentAdmin> {
  return requireAdmin();
}
