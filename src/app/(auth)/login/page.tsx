'use client';

import { useActionState } from 'react';
import { ShieldCheck, Lock } from 'lucide-react';
import { loginAction, type LoginState } from '@/lib/auth-actions';

const initial: LoginState = { error: '', code: null };

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, initial);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] px-4">
      <div className="w-full max-w-[380px] rounded-lg border border-[#E5E6EB] bg-white p-8">
        {/* 品牌头 */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#006855]">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-[#1F2329]">引力治理中心</div>
            <div className="mt-0.5 text-[11px] tracking-widest text-[#646A73]">GRAVITY GOVERNANCE</div>
          </div>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm text-[#1F2329]">
              邮箱
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="admin@governance.cn"
              className="h-10 w-full rounded-lg border border-[#E5E6EB] bg-white px-3 text-sm text-[#1F2329] outline-none transition-colors placeholder:text-[#9AA0A6] focus:border-[#006855]"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm text-[#1F2329]">
              密码
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="h-10 w-full rounded-lg border border-[#E5E6EB] bg-white px-3 text-sm text-[#1F2329] outline-none transition-colors placeholder:text-[#9AA0A6] focus:border-[#006855]"
            />
          </div>

          {state.error && (
            <div className="flex items-center gap-1.5 rounded-md bg-[#FDEBEA] px-3 py-2 text-xs text-[#F54A45]">
              <Lock className="h-3.5 w-3.5" />
              {state.error}
            </div>
          )}

          <button
            type="submit"
            className="flex h-10 w-full items-center justify-center rounded-lg bg-[#006855] text-sm font-medium text-white transition-colors hover:bg-[#005643]"
          >
            登 录
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-[#A0A6B0]">
          仅限平台治理运营人员访问 · 登录即代表同意治理规范
        </p>
      </div>
    </div>
  );
}
