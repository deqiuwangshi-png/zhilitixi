// 认证会话域：命令层（写操作）。
// 编辑当前管理员资料（users 表 + auth user_metadata 同步）与修改密码。
// 授权由 route / action 层 requireAuthAccess 先行；落库失败抛稳定 AuthError。
import { getSupabasePrivilegedClient, getSupabasePublicClient } from '@/storage/database/supabase-client';
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
import type { ProfilePatch } from './auth.types';
import type { UpdateProfileInput } from './auth.schema';

/** 编辑当前管理员资料（写回主库 users 表 + 同步 auth user_metadata） */
export async function updateAdminProfile(
  admin: { userId: string },
  input: UpdateProfileInput,
): Promise<void> {
  const client = getSupabasePrivilegedClient();

  const patch: Partial<ProfilePatch> = {};
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
  admin: { userId: string },
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
