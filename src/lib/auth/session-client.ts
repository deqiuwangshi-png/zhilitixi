// 当前请求会话的 RLS 客户端工厂：统一从 gov-session cookie（Supabase access_token JWT）
// 解析登录用户身份，构造带用户态 token 的 RLS 客户端（RLS 作为行级边界）。
// 业务读取一律经本 helper 走 RLS；service-role（privileged）仅保留写路径（commands /
// 事务 RPC / auth 管理写）。无 token 时 fail-closed：直接抛 AUTH_REQUIRED，由页面
// requirePermission / 布局 requireAdmin 先行拦截，绝不回退 privileged。
import 'server-only';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseRlsClient } from '@/storage/database/supabase-client';
import { SESSION_COOKIE } from '@/lib/auth-cookies';
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
import type { Database } from '@/lib/db-types';

/** 读取当前请求的 Supabase access token（gov-session cookie，即 JWT）。无 token 抛 AUTH_REQUIRED。 */
export async function getSessionAccessToken(): Promise<string> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) throw new AuthError(AUTH_ERROR_CODES.AUTH_REQUIRED);
  return token;
}

/** 当前请求的 RLS 客户端（带用户态 token，行级安全策略生效）。 */
export async function getSessionRlsClient(): Promise<SupabaseClient<Database>> {
  return getSupabaseRlsClient(await getSessionAccessToken());
}
