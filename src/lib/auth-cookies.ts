// 鉴权 cookie 常量与选项（纯函数，无副作用，供 middleware / auth / actions 共用）

export const SESSION_COOKIE = 'gov-session';
export const REFRESH_COOKIE = 'gov-refresh';

/** 刷新 token 的有效期（秒）。Supabase 默认 refresh token 生命周期为 60 天，此处保持一致。 */
export const REFRESH_MAX_AGE_SECONDS = 60 * 24 * 60 * 60;

/** 会话 cookie 基础安全属性（不含有效期，access token 生命周期由 JWT 自身决定） */
export function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

/** 刷新 cookie 安全属性：在上层基础上绑定有效期，避免永久/超长有效 */
export function refreshCookieOpts() {
  return {
    ...cookieOpts(),
    maxAge: REFRESH_MAX_AGE_SECONDS,
  };
}
