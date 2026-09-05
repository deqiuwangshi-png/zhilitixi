// 当前请求的认证与授权上下文。
// 让页面 / Server Action / Route Handler 从同一来源解析“是谁、什么角色、可做什么”。
import 'server-only';
import { getCurrentAdmin } from '@/lib/auth';
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
import { getSessionRlsClient } from '@/lib/auth/session-client';
import { Permissions, type Permission } from '@/lib/auth/permissions';

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
 * 纯函数：从「数据库已授予的权限 id」中筛选出 permissions.ts 定义内已知的权限。
 * 结果保持 Permissions 定义顺序（稳定、可断言）。
 */
export function filterGrantedPermissions(grantedIds: readonly string[]): readonly Permission[] {
  const granted = new Set(grantedIds);
  return Object.values(Permissions).filter((p) => granted.has(p));
}

/**
 * 从数据库读取用户实际权限：user_roles → role_permissions → permissions。
 * 仅返回 permissions.ts 定义内存在、且被授权给该用户的权限。
 *
 * fail-closed：任一查询失败（异常）均视为无权限，返回空权限集（console.error 留痕，
 * 不向页面抛出）；页面 / Server Action 的 requirePermission 因此抛 FORBIDDEN。
 * 注意：RBAC 迁移（006）未落地时，登录管理员查不到 user_roles 角色，
 * 同样获得空权限集（FORBIDDEN）——这是预期的安全行为，不是回退。
 * （导出仅为单测：覆盖过滤边界与 fail-closed 语义。）
 */
export async function loadUserPermissions(userId: string): Promise<readonly Permission[]> {
  try {
    // 读取走 RLS 用户客户端（当前请求管理员 token）；RBAC 表 006 的 *_admin_all 策略放行
    // 管理员读取，fail-closed 语义不变（异常 → 空权限）。
    const client = await getSessionRlsClient();
    const { data: membership } = await client.from('user_roles').select('role_id').eq('user_id', userId);
    const roleIds = (membership ?? []).map((r) => r.role_id);
    if (roleIds.length === 0) return [];

    const { data: rolePerms } = await client
      .from('role_permissions')
      .select('permission_id')
      .in('role_id', roleIds);
    const permIds = (rolePerms ?? []).map((p) => p.permission_id);
    if (permIds.length === 0) return [];

    const { data: permRows } = await client.from('permissions').select('id').in('id', permIds);
    return filterGrantedPermissions((permRows ?? []).map((p) => p.id));
  } catch (error) {
    // RBAC 异常即拒绝：权限解析失败一律按无权限处理（fail-closed），不向页面抛出。
    console.error('[auth] 加载用户权限失败，按空权限（fail-closed）处理：', error);
    return [];
  }
}

/**
 * 解析当前请求的认证上下文。
 * 未登录 / 非管理员返回 null；管理员按其数据库角色/权限返回。
 * fail-closed：RBAC 迁移（006）未落地或权限解析异常时，管理员权限集为空，
 * 任何 requirePermission 均抛 FORBIDDEN（而非回退为全量权限）。
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const admin = await getCurrentAdmin();
  if (!admin) return null;
  const permissions = await loadUserPermissions(admin.userId);
  return {
    userId: admin.userId,
    name: admin.name,
    role: 'admin',
    permissions,
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