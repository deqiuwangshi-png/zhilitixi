// 服务端鉴权工具：从 cookie 解析当前登录用户，并提供管理员校验。
// 供 RSC 页面 / Server Actions / Route Handlers 使用。
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSupabaseRlsClient } from '@/storage/database/supabase-client';
import { SESSION_COOKIE } from '@/lib/auth-cookies';

/** 用用户 token 创建 anon+JWT 客户端（校验用，不缓存） */
export function getUserClient(token: string) {
  return getSupabaseRlsClient(token);
}

/** 读取当前登录用户（无则 null） */
export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const { data, error } = await getUserClient(token).auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export interface CurrentAdmin {
  userId: string;
  name: string;
}

/** 读取当前管理员（登录 + users.is_admin，无则 null） */
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await getUserClient((await cookies()).get(SESSION_COOKIE)?.value ?? '')
    .from('users')
    .select('id,name,is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!data?.is_admin) return null;
  return { userId: data.id, name: data.name ?? '管理员' };
}

/** 页面/操作守卫：未登录或非管理员 → 重定向登录页 */
export async function requireAdmin(): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/login');
  return admin;
}
