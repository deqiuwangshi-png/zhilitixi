import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/dao';
import { getCurrentAdmin } from '@/lib/auth';
import type { UsersRow } from '@/lib/db-types';

// GET /api/auth/me - 当前管理员聚合资料 + 会话列表（需登录 + is_admin）
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: '未登录或无权访问' }, { status: 401 });

  const client = db();
  const { data: profile, error: profileError } = await client
    .from('users')
    .select('id,name,bio,avatar_url,points,badge,created_at,cover_url')
    .eq('id', admin.userId)
    .maybeSingle();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  let email = '';
  let phone = '';
  let provider = '';
  let emailConfirmed = false;
  let authName = '';

  try {
    const { data: authUser, error: authError } = await client.auth.admin.getUserById(admin.userId);
    if (authError) {
      // 业务用户存在但 auth 用户缺失时，不阻断其余资料返回
      console.warn('[auth/me] getUserById failed:', authError.message);
    } else if (authUser?.user) {
      const u = authUser.user;
      email = u.email ?? '';
      phone = u.phone ?? '';
      provider = ((u.app_metadata as Record<string, unknown> | undefined)?.['provider'] as string) ?? '';
      emailConfirmed = !!(u.email_confirmed_at ?? u.confirmed_at);
      authName = ((u.user_metadata as Record<string, unknown> | undefined)?.['name'] as string) ?? '';
    }
  } catch {
    // 忽略 auth 查询异常
  }

  let sessions: { id: string; user_agent: string; created_at: string; updated_at: string }[] = [];
  try {
    const { data, error } = await client.rpc('list_user_sessions', { uid: admin.userId });
    if (!error) sessions = data ?? [];
  } catch {
    // 忽略会话查询异常
  }

  const rows = sessions.map((s) => ({
    id: s.id,
    userAgent: s.user_agent,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }));

  const user = {
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

  return NextResponse.json({ user, sessions: rows });
}

// PUT /api/auth/me - 编辑当前管理员资料（写回主库 users 表 + 同步 auth user_metadata）
export async function PUT(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: '未登录或无权访问' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, bio, badge } = body ?? {};
  const client = db();

  const patch: Partial<Pick<UsersRow, 'name' | 'bio' | 'badge'>> = {};
  if (typeof name === 'string' && name.trim()) patch.name = name.trim();
  if (typeof bio === 'string') patch.bio = bio;
  if (typeof badge === 'string') patch.badge = badge;

  if (Object.keys(patch).length > 0) {
    const { error } = await client.from('users').update(patch).eq('id', admin.userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 尽力同步 auth.user_metadata.name（失败不阻断主流程）
  try {
    const meta: { name?: string } = {};
    if (typeof name === 'string' && name.trim()) meta.name = name.trim();
    if (Object.keys(meta).length > 0) {
      await client.auth.admin.updateUserById(admin.userId, { user_metadata: meta });
    }
  } catch {
    // 忽略
  }

  return NextResponse.json({ success: true });
}
