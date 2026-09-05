// 当前请求的认证与授权上下文。
// 让页面 / Server Action / Route Handler 从同一来源解析“是谁、什么角色、可做什么”。
import 'server-only';
import { getCurrentAdmin } from '@/lib/auth';
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
import { ALL_PERMISSIONS, Permissions, type Permission } from '@/lib/auth/permissions';
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';

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
 * 从数据库读取用户实际权限：user_roles → role_permissions → permissions。
 * 仅返回 permissions.ts 定义内存在、且被授权给该用户的权限。
 * 若 RBAC 表尚未上线（提取期间未执行 006 迁移），回退为 is_admin 全量权限（过渡兼容，
 * 待 006 落地后依赖 006 的 admin 灌角色即可，无需 fallback）。
 */
async function loadUserPermissions(userId: string): Promise<readonly Permission[]> {
  const client = getSupabasePrivilegedClient();
  try {
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
    const granted = new Set((permRows ?? []).map((p) => p.id));
    return Object.values(Permissions).filter((p) => granted.has(p));
  } catch {
    // 006 RBAC 表未上线时的过渡回退；上线后由数据库权限为准。
    return ALL_PERMISSIONS;
  }
}

/**
 * 解析当前请求的认证上下文。
 * 未登录 / 非管理员返回 null；管理员按其数据库角色/权限返回（不再是无条件全量）。
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