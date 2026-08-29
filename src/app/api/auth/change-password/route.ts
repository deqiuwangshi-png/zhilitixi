import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { db } from '@/lib/dao';
import { getCurrentAdmin } from '@/lib/auth';
import { getSupabaseCredentials } from '@/storage/database/supabase-client';

// POST /api/auth/change-password
// body: { currentPassword, newPassword }
// 校验当前密码（Supabase Auth password grant）后，通过 admin API 更新新密码。
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: '未登录或无权访问' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { currentPassword, newPassword } = body ?? {};

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: '请填写当前密码与新密码' }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: '新密码长度至少 6 位' }, { status: 400 });
  }

  const client = db();

  // 1. 获取当前用户的 email（主库无 email 字段，需从 auth 侧读取）
  let email = '';
  try {
    const { data, error } = await client.auth.admin.getUserById(admin.userId);
    if (error || !data?.user) {
      return NextResponse.json({ error: '未找到当前用户认证信息' }, { status: 404 });
    }
    const u = data.user;
    email = u.email ?? '';
    const provider = ((u.app_metadata as Record<string, unknown> | undefined)?.['provider'] as string) ?? '';
    if (!email) {
      return NextResponse.json({ error: '该账户未绑定邮箱，无法修改密码' }, { status: 400 });
    }
    if (provider && provider !== 'email') {
      return NextResponse.json({ error: `该账户通过 ${provider} 第三方登录，无本地密码可修改` }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: `获取认证信息失败：${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }

  // 2. 校验当前密码（使用匿名/publishable key 客户端的 password 登录）
  let anonClient;
  try {
    const { url, anonKey } = getSupabaseCredentials();
    anonClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { timeout: 30000 },
    });
  } catch (e) {
    return NextResponse.json({ error: `初始化校验客户端失败：${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }

  const { error: signInError } = await anonClient.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (signInError) {
    return NextResponse.json({ error: '当前密码不正确' }, { status: 401 });
  }

  // 3. 更新新密码
  const { error: updateError } = await client.auth.admin.updateUserById(admin.userId, {
    password: newPassword,
  });
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
