// 鉴权 Server Actions：登录 / 登出（'use server' 文件）
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSupabasePublicClient, getSupabaseRlsClient } from '@/storage/database/supabase-client';
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
  if (error || !data.session || !data.user) {
    // 不暴露 Supabase 原始错误；统一映射为凭据无效，避免账号枚举风险
    return {
      error: '邮箱或密码不正确',
      code: AUTH_ERROR_CODES.PASSWORD_INVALID,
    };
  }

  // 凭据已通过后再校验后台管理员身份：非管理员给出友好提示，不写入会话。
  // 用刚签发的 token 走 RLS（users_select_self 允许读本人行），不占用特权客户端。
  try {
    const rls = getSupabaseRlsClient(data.session.access_token);
    const { data: profile } = await rls
      .from('users')
      .select('is_admin')
      .eq('id', data.user.id)
      .maybeSingle();
    if (!profile?.is_admin) {
      return {
        error: '该账号暂无后台管理权限，请联系管理员开通后再试',
        code: AUTH_ERROR_CODES.FORBIDDEN,
      };
    }
  } catch {
    // 管理员校验查询异常时回退原逻辑（由 requireAdmin 兜底拦截），不阻断正常管理员登录
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
