// 全局鉴权中间件：校验登录 cookie（JWT），失效时用 refresh_token 自动刷新。
// 未登录访问受保护页面 → 重定向 /login。
// 注意：仅依赖 process.env（middleware 运行环境不加载服务端模块，避免拖入上报 SDK）。
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SESSION_COOKIE, REFRESH_COOKIE, cookieOpts, refreshCookieOpts } from '@/lib/auth-cookies';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login|api/auth).*)'],
};

export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) {
    return new NextResponse('Authentication service is not configured', { status: 500 });
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  // 1) 有 token → 校验
  if (token) {
    const sb = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await sb.auth.getUser(token);
    if (!error) return NextResponse.next();

    // 2) token 失效 → 尝试刷新一次
    if (refreshToken) {
      const rsb = createClient(url, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data, error: refreshError } = await rsb.auth.refreshSession({
        refresh_token: refreshToken,
      });
      if (!refreshError && data.session) {
        const res = NextResponse.next();
        res.cookies.set(SESSION_COOKIE, data.session.access_token, cookieOpts());
        res.cookies.set(REFRESH_COOKIE, data.session.refresh_token, refreshCookieOpts());
        return res;
      }
    }
  }

  // 3) 未登录 / 刷新失败 → 重定向登录页
  const loginUrl = new URL('/login', req.url);
  return NextResponse.redirect(loginUrl);
}
