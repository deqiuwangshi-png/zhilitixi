// 认证会话域：查询层。
// 当前管理员聚合资料 + 会话列表（/api/auth/me 的数据访问）。
// 说明：本查询需读 auth 侧元数据（email/phone/provider）与 RPC 会话列表，
// 只能用 privileged client 的 auth.admin API——与"业务行读走 RLS"不冲突（RLS 管业务表，
// auth 元数据无行级策略可言）；授权由 route 层 requireAuthAccess 先行。
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import type {
  AdminProfileResult,
  AdminProfileUser,
  AdminSession,
} from './auth.types';

/** 当前管理员聚合资料 + 会话列表 */
export async function getAdminProfileAndSessions(admin: {
  userId: string;
}): Promise<AdminProfileResult> {
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

  const user: AdminProfileUser = {
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
  };

  const sessionItems: AdminSession[] = sessions.map((s) => ({
    id: s.id,
    userAgent: s.user_agent,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }));

  return { user, sessions: sessionItems };
}
