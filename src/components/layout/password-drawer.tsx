'use client';

import { useState } from 'react';
import { X, KeyRound, LockKeyhole, Eye, EyeOff } from 'lucide-react';

export function PasswordDrawer({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [show, setShow] = useState<{ cur: boolean; next: boolean; confirm: boolean }>({ cur: false, next: false, confirm: false });

  const submit = async () => {
    setMsg(null);
    if (!form.currentPassword) return setMsg({ type: 'error', text: '请输入当前密码' });
    if (!form.newPassword) return setMsg({ type: 'error', text: '请输入新密码' });
    if (form.newPassword.length < 6) return setMsg({ type: 'error', text: '新密码长度至少 6 位' });
    if (form.newPassword !== form.confirmPassword) return setMsg({ type: 'error', text: '两次输入的新密码不一致' });

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: 'error', text: data.error || '修改失败' });
        return;
      }
      setMsg({ type: 'success', text: '密码修改成功' });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      setMsg({ type: 'error', text: '修改失败，请重试' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" style={{ animation: 'fadeIn 200ms ease-out' }} onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col bg-white ring-1 ring-[#E5E6EB]" style={{ animation: 'drawerIn 250ms ease-out' }}>
        <div className="border-b border-[#E5E6EB] px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1F2329]">修改密码</h2>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-[#646A73] transition-colors hover:bg-[#F8FAFC]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-[#646A73]">请定期更换密码以保障账户安全</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex items-center gap-2 rounded-md bg-[#F7F8FA] px-3 py-2 text-xs text-[#646A73]">
            <LockKeyhole className="h-3.5 w-3.5 text-[#006855]" />
            修改后建议重新登录，本账户将自动撤销全部会话
          </div>

          {msg && (
            <div className={`mt-4 rounded-md px-3 py-2 text-xs ${msg.type === 'error' ? 'bg-[#FDEAEA] text-[#F54A45]' : 'bg-[#E8F5F1] text-[#006855]'}`}>
              {msg.text}
            </div>
          )}

          <div className="mt-5 space-y-4">
            <PasswordField
              label="当前密码"
              value={form.currentPassword}
              visible={show.cur}
              onToggle={() => setShow({ ...show, cur: !show.cur })}
              onChange={(v) => setForm({ ...form, currentPassword: v })}
              placeholder="请输入当前密码"
            />
            <PasswordField
              label="新密码"
              value={form.newPassword}
              visible={show.next}
              onToggle={() => setShow({ ...show, next: !show.next })}
              onChange={(v) => setForm({ ...form, newPassword: v })}
              placeholder="至少 6 位"
            />
            <PasswordField
              label="确认新密码"
              value={form.confirmPassword}
              visible={show.confirm}
              onToggle={() => setShow({ ...show, confirm: !show.confirm })}
              onChange={(v) => setForm({ ...form, confirmPassword: v })}
              placeholder="再次输入新密码"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-[#E5E6EB] px-6 py-4">
          <button
            onClick={submit}
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#006855] py-2 text-sm font-medium text-white transition-colors hover:bg-[#005A4B] disabled:opacity-60"
          >
            <KeyRound className="h-4 w-4" />
            {submitting ? '提交中...' : '确认修改'}
          </button>
          <button onClick={onClose} className="flex-1 rounded-md border border-[#E5E6EB] py-2 text-sm font-medium text-[#1F2329] transition-colors hover:bg-[#F8FAFC]">
            取消
          </button>
        </div>
      </div>
    </>
  );
}

function PasswordField({
  label,
  value,
  visible,
  onToggle,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  visible: boolean;
  onToggle: () => void;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[#1F2329]">{label} *</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-[#E5E6EB] px-3 py-2 pr-10 text-sm text-[#1F2329] outline-none transition-colors focus:border-[#006855]"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-[#646A73] transition-colors hover:text-[#006855]"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}