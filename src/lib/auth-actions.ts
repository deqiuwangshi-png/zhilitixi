// 鉴权 Server Actions：登录 / 登出（'use server' 文件）
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getSupabaseCredentials } from '@/storage/database/supabase-client';
import { SESSION_COOKIE, REFRESH_COOKIE, cookieOpts } from '@/lib/auth-cookies';

const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少 6 位'),
});

export interface LoginState {
  error: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '输入不合法' };
  }

  const { url, anonKey } = getSupabaseCredentials();
  const sb = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await sb.auth.signInWithPassword(parsed.data);
  if (error || !data.session) {
    return { error: error?.message ?? '登录失败' };
  }

  const store = await cookies();
  const opts = cookieOpts();
  store.set(SESSION_COOKIE, data.session.access_token, opts);
  store.set(REFRESH_COOKIE, data.session.refresh_token, opts);
  redirect('/');
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(REFRESH_COOKIE);
}
