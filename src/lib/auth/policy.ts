// 资源动作授权：统一 policy 入口。
// 页面 / Server Action / Route Handler 复用同一套判断逻辑，权限名称集中在 permissions.ts。
import 'server-only';
import { getAuthContext, type AuthContext } from '@/lib/auth/context';
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
import type { Permission } from '@/lib/auth/permissions';

/** 纯权限判断：是否具备指定权限（未登录/无权限返回 false）。 */
export async function can(permission: Permission): Promise<boolean> {
  const ctx = await getAuthContext();
  return ctx ? ctx.permissions.includes(permission) : false;
}

/**
 * 要求具备指定权限，否则抛出 AuthError（AUTH_REQUIRED / FORBIDDEN）。
 * 适合 Server Action 与 Route Handler：外层 catch 后映射为稳定错误。
 */
export async function requirePermission(permission: Permission): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw new AuthError(AUTH_ERROR_CODES.AUTH_REQUIRED);
  if (!ctx.permissions.includes(permission)) throw new AuthError(AUTH_ERROR_CODES.FORBIDDEN);
  return ctx;
}