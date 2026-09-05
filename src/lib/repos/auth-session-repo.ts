// 认证会话仓储层：/api/auth/me 与 /api/auth/change-password 的数据访问唯一入口。
// Route Handler 只负责协议解析与错误映射，不直接拼接数据库或 Auth 查询。
import { getSupabasePublicClient, getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import type { UsersRow } from '@/lib/db-types';
import type { UpdateProfileInput } from '@/lib/validations/auth-api.schema';
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';

export interface AdminProfileInput {
  userId: string;
}

/** 当前管理员聚合资料 + 会话列表 */
export async function getAdminProfileAndSessions(admin: AdminProfileInput): Promise<{
  user: {
    id: string;
    name: string;
    bio: string;
    avatarUrl: string;
    coverUrl: string;
    points: number;
    badge: string;
    createdAt: string | null;
    email: string;
    phone: string;
    provider: string;
    emailConfirmed: boolean;
  };
  sessions: { id: string; userAgent: string; createdAt: string; updatedAt: string }[];
}> {
  const client = getSupabasePrivilegedClient();
  const { data: profile } = await client
    .from('users')
    .select('id,name,bio,avatar_url,points,badge,created_at,cover_url')
    .eq('id', admin.userId)
    .maybeSingle();

  // auth 侧信息（失败不阻断其余资料返回）
  let email = '';
  let phone = '';
  let provider = '';
  let emailConfirmed = false;
  let authName = '';
  try {
    const { data: authUser } = await client.auth.admin.getUserById(admin.userId);
    const u = authUser?.user;
    if (u) {
      email = u.email ?? '';
      phone = u.phone ?? '';
      provider = ((u.app_metadata as Record<string, unknown> | undefined)?.['provider'] as string) ?? '';
      emailConfirmed = !!(u.email_confirmed_at ?? u.confirmed_at);
      authName = ((u.user_metadata as Record<string, unknown> | undefined)?.['name'] as string) ?? '';
    }
  } catch {
    // 忽略 auth 查询异常
  }

  // 会话列表
  let sessions: { id: string; user_agent: string; created_at: string; updated_at: string }[] = [];
  try {
    const { data } = await client.rpc('list_user_sessions', { uid: admin.userId });
    if (data) sessions = data;
  } catch {
    // 忽略会话查询异常
  }

  return {
    user: {
      id: profile?.id ?? admin.userId,
      name: profile?.name || authName || '管理员',
      bio: profile?.bio ?? '',
      avatarUrl: profile?.avatar_url ?? '',
      coverUrl: profile?.cover_url ?? '',
      points: profile?.points ?? 0,
      badge: profile?.badge ?? 'none',
      createdAt: profile?.created_at ?? null,
      email,
      phone,
      provider,
      emailConfirmed,
    },
    sessions: sessions.map((s) => ({
      id: s.id,
      userAgent: s.user_agent,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    })),
  };
}

/** 编辑当前管理员资料（写回主库 users 表 + 同步 auth user_metadata） */
export async function updateAdminProfile(admin: AdminProfileInput, input: UpdateProfileInput): Promise<void> {
  const client = getSupabasePrivilegedClient();

  const patch: Partial<Pick<UsersRow, 'name' | 'bio' | 'badge'>> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.bio !== undefined) patch.bio = input.bio;
  if (input.badge !== undefined) patch.badge = input.badge;

  if (Object.keys(patch).length > 0) {
    const { error } = await client.from('users').update(patch).eq('id', admin.userId);
    if (error) {
      throw new AuthError(AUTH_ERROR_CODES.INTERNAL_ERROR); // 底层细节由日志记录，不对外
    }
  }

  // 尽力同步 auth.user_metadata.name（失败不阻断主流程）
  if (input.name) {
    try {
      await client.auth.admin.updateUserById(admin.userId, { user_metadata: { name: input.name } });
    } catch {
      // 忽略
    }
  }
}

/** 校验当前密码后更新新密码。校验失败抛错；成功无返回。 */
export async function changeAdminPassword(
  admin: AdminProfileInput,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const client = getSupabasePrivilegedClient();

  // 1. 获取当前用户的 email（主库无 email 字段，需从 auth 侧读取）
  let email = '';
  let provider = '';
  try {
    const { data: authUser } = await client.auth.admin.getUserById(admin.userId);
    const u = authUser?.user;
    if (!u) throw new Error('not found');
    email = u.email ?? '';
    provider = ((u.app_metadata as Record<string, unknown> | undefined)?.['provider'] as string) ?? '';
  } catch {
    throw new AuthError(AUTH_ERROR_CODES.AUTH_USER_NOT_FOUND);
  }
  if (!email) throw new AuthError(AUTH_ERROR_CODES.AUTH_USER_NOT_FOUND, '该账户未绑定邮箱，无法修改密码');
  if (provider && provider !== 'email') {
    throw new AuthError(AUTH_ERROR_CODES.PASSWORD_UPDATE_FAILED, `该账户通过 ${provider} 第三方登录，无本地密码可修改`);
  }

  // 2. 校验当前密码（publishable key 客户端的 password 登录）
  let signInError: Error | null = null;
  try {
    const { error } = await getSupabasePublicClient().auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    signInError = error;
  } catch (e) {
    signInError = e instanceof Error ? e : new Error(String(e));
  }
  if (signInError) throw new AuthError(AUTH_ERROR_CODES.PASSWORD_INVALID);

  // 3. 更新新密码
  const { error: updateError } = await client.auth.admin.updateUserById(admin.userId, {
    password: newPassword,
  });
  if (updateError) throw new AuthError(AUTH_ERROR_CODES.PASSWORD_UPDATE_FAILED);
}