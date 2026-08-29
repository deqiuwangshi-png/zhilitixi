// 鉴权 cookie 常量与选项（纯函数，无副作用，供 middleware / auth / actions 共用）

export const SESSION_COOKIE = 'gov-session';
export const REFRESH_COOKIE = 'gov-refresh';

export function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}
