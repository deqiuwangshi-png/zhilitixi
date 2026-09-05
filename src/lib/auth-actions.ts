// 鉴权 Server Actions：登录 / 登出（'use server' 文件）
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSupabasePublicClient } from '@/storage/database/supabase-client';
import { SESSION_COOKIE, REFRESH_COOKIE, cookieOpts, refreshCookieOpts } from '@/lib/auth-cookies';
import { AUTH_ERROR_CODES, type AuthErrorCode } from '@/lib/auth/errors';

const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少 6 位'),
});

export interface LoginState {
  error: string;
  code: AuthErrorCode | null;
}

const LOGIN_VALIDATION_ERROR: LoginState = {
  error: '邮箱或密码格式不正确',
  code: AUTH_ERROR_CODES.VALIDATION_FAILED,
};

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return LOGIN_VALIDATION_ERROR;
  }

  const sb = getSupabasePublicClient();

  const { data, error } = await sb.auth.signInWithPassword(parsed.data);
  if (error || !data.session) {
    // 不暴露 Supabase 原始错误；统一映射为凭据无效，避免账号枚举风险
    return {
      error: '邮箱或密码不正确',
      code: AUTH_ERROR_CODES.PASSWORD_INVALID,
    };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, data.session.access_token, cookieOpts());
  store.set(REFRESH_COOKIE, data.session.refresh_token, refreshCookieOpts());
  redirect('/');
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(REFRESH_COOKIE);
}
