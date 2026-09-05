// 当前请求的认证与授权上下文。
// 让页面 / Server Action / Route Handler 从同一来源解析“是谁、什么角色、可做什么”。
import 'server-only';
import { getCurrentAdmin } from '@/lib/auth';
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
import { ALL_PERMISSIONS, type Permission } from '@/lib/auth/permissions';

export type AuthRole = 'admin' | 'user' | 'anonymous';

/** 一次请求内解析出的认证上下文。 */
export interface AuthContext {
  userId: string;
  name: string;
  /** 兼容阶段：当前仅有 is_admin 布尔模型，管理员角色统一为 admin。 */
  role: AuthRole;
  /** 该上下文具备的权限集合。 */
  permissions: readonly Permission[];
}

/**
 * 解析当前请求的认证上下文。
 * 未登录 / 非管理员返回 null；管理员返回带完整权限集的上下文（兼容阶段）。
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const admin = await getCurrentAdmin();
  if (!admin) return null;
  return {
    userId: admin.userId,
    name: admin.name,
    role: 'admin',
    permissions: ALL_PERMISSIONS,
  };
}

/** 要求存在认证上下文；未登录则抛出 AUTH_REQUIRED。 */
export async function getAuthContextOrThrow(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) {
    throw new AuthError(AUTH_ERROR_CODES.AUTH_REQUIRED);
  }
  return ctx;
}