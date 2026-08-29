'use client';

import { useState } from 'react';
import { X, Pencil, Save, AtSign, ShieldCheck, CalendarDays, Coins } from 'lucide-react';
import type { CurrentUser } from './auth-types';

const BADGE_OPTIONS = [
  { value: 'none', label: '无徽章' },
  { value: 'discoverer', label: '发现者' },
  { value: 'contributor', label: '贡献者' },
  { value: 'moderator', label: '版主' },
];

export function ProfileDrawer({
  user,
  onClose,
  onSaved,
}: {
  user: CurrentUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user.name, bio: user.bio, badge: user.badge });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const role = user.badge && user.badge !== 'none' && user.badge !== '' ? '版主' : '普通用户';

  const save = async () => {
    if (!form.name.trim()) {
      setMsg({ type: 'error', text: '昵称不能为空' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: 'error', text: data.error || '保存失败' });
        return;
      }
      setEditing(false);
      onSaved();
    } catch {
      setMsg({ type: 'error', text: '保存失败，请重试' });
    } finally {
      setSaving(false);
    }
  };

  const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('zh-CN') : '—');
  const avatar = user.avatarUrl?.startsWith('http')
    ? user.avatarUrl
    : '';

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" style={{ animation: 'fadeIn 200ms ease-out' }} onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col bg-white ring-1 ring-[#E5E6EB]" style={{ animation: 'drawerIn 250ms ease-out' }}>
        {/* 头部 */}
        <div className="border-b border-[#E5E6EB] px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1F2329]">个人信息</h2>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-[#646A73] transition-colors hover:bg-[#F8FAFC]">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* 头像区 */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[#006855]">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-white">{(user.name || '管')[0]}</div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-lg font-semibold text-[#1F2329]">{user.name}</span>
                <span className="shrink-0 rounded bg-[#E8F5F1] px-2 py-0.5 text-xs font-medium text-[#006855]">{role}</span>
              </div>
              <div className="mt-1 flex items-center gap-1 truncate font-mono text-xs text-[#646A73]">
                <AtSign className="h-3 w-3 shrink-0" />
                {user.email || '未绑定邮箱'}
              </div>
              {user.provider && (
                <div className="mt-1 text-[11px] text-[#646A73]">
                  登录方式：{user.provider === 'github' ? 'GitHub 第三方' : user.provider === 'email' ? '邮箱密码' : user.provider}
                </div>
              )}
            </div>
          </div>

          {/* 信息字段 */}
          <div className="mt-6 space-y-3">
            <InfoRow icon={<ShieldCheck className="h-4 w-4 text-[#006855]" />} label="用户 ID" mono>
              {user.id}
            </InfoRow>
            <InfoRow icon={<CalendarDays className="h-4 w-4 text-[#006855]" />} label="注册时间" mono>
              {fmt(user.createdAt)}
            </InfoRow>
            <InfoRow icon={<Coins className="h-4 w-4 text-[#006855]" />} label="积分" mono>
              {user.points}
            </InfoRow>
          </div>

          {msg && (
            <div className={`mt-4 rounded-md px-3 py-2 text-xs ${msg.type === 'error' ? 'bg-[#FDEAEA] text-[#F54A45]' : 'bg-[#E8F5F1] text-[#006855]'}`}>
              {msg.text}
            </div>
          )}

          {/* 编辑表单 */}
          {editing ? (
            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#1F2329]">昵称 *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-md border border-[#E5E6EB] px-3 py-2 text-sm text-[#1F2329] outline-none transition-colors focus:border-[#006855]"
                  placeholder="请输入昵称"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#1F2329]">个人简介</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={3}
                  className="w-full resize-none rounded-md border border-[#E5E6EB] px-3 py-2 text-sm text-[#1F2329] outline-none transition-colors focus:border-[#006855]"
                  placeholder="介绍一下自己"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#1F2329]">徽章</label>
                <select
                  value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })}
                  className="w-full rounded-md border border-[#E5E6EB] bg-white px-3 py-2 text-sm text-[#1F2329] outline-none transition-colors focus:border-[#006855]"
                >
                  {BADGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#006855] py-2 text-sm font-medium text-white transition-colors hover:bg-[#005A4B] disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={() => { setEditing(false); setMsg(null); setForm({ name: user.name, bio: user.bio, badge: user.badge }); }}
                  className="flex-1 rounded-md border border-[#E5E6EB] py-2 text-sm font-medium text-[#1F2329] transition-colors hover:bg-[#F8FAFC]"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-[#E5E6EB] p-4">
              <div className="text-xs font-medium text-[#1F2329]">个人简介</div>
              <div className="mt-2 text-sm text-[#646A73]">{user.bio || '这个人很懒，什么都没写。'}</div>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center gap-3 border-t border-[#E5E6EB] px-6 py-4">
          {!editing && (
            <button
              onClick={() => { setEditing(true); setMsg(null); }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#006855] py-2 text-sm font-medium text-white transition-colors hover:bg-[#005A4B]"
            >
              <Pencil className="h-4 w-4" />
              编辑资料
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function InfoRow({ icon, label, mono, children }: { icon: React.ReactNode; label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#E5E6EB] p-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] text-[#646A73]">{label}</div>
        <div className={`mt-0.5 break-all text-sm text-[#1F2329] ${mono ? 'font-mono text-xs' : ''}`}>{children}</div>
      </div>
    </div>
  );
}