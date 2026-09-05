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
 * 语义区分（fail-closed，但不静默）：
 * - 查询成功但用户无角色 / 无权限授予 → 空权限集；requirePermission 抛 FORBIDDEN（确实无权限）。
 * - 查询异常（RBAC 数据源不可用）→ 抛 AUTHZ_UNAVAILABLE（基础设施故障，与「确实无权限」可区分，
 *   运维可从错误码识别权限系统故障；对外文案仍不含数据库细节，详情走 console.error 留痕）。
 * 注意：RBAC 迁移（006）未落地时查询会异常 → AUTHZ_UNAVAILABLE，这是预期的安全行为，不是回退。
 * （导出仅为单测：覆盖过滤边界与故障语义。）
 */
export async function loadUserPermissions(userId: string): Promise<readonly Permission[]> {
  try {
    // 读取走 RLS 用户客户端（当前请求管理员 token）；RBAC 表 006 的 *_admin_all 策略放行
    // 管理员读取，fail-closed 语义不变（异常 → AUTHZ_UNAVAILABLE）。
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
    // RBAC 数据源异常：区别于「确实无权限」，抛 AUTHZ_UNAVAILABLE（对外不含数据库细节）。
    console.error('[auth] 加载用户权限失败（权限系统不可用）：', error);
    throw new AuthError(AUTH_ERROR_CODES.AUTHZ_UNAVAILABLE);
  }
}

/**
 * 解析当前请求的认证上下文。
 * 未登录 / 非管理员返回 null；管理员按其数据库角色/权限返回。
 * fail-closed：无角色/无授予 → 空权限集（requirePermission 抛 FORBIDDEN）；
 * RBAC 数据源异常 → AUTHZ_UNAVAILABLE 向上传播（与 FORBIDDEN 可区分，均不回退为全量权限）。
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