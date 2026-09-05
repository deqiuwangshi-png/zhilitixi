'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import type { UserListItem } from '@/lib/repos/user-repo';
import { editUser } from '@/lib/actions/user-actions';

interface Props {
  user: UserListItem;
  onClose: () => void;
}

/** 编辑用户抽屉：保存走 Server Action，成功后刷新 RSC */
export function UserEditDrawer({ user, onClose }: Props) {
  const router = useRouter();
  const [name, setName] = useState(user.name || '');
  const [role, setRole] = useState(user.role || 'user');
  const [points, setPoints] = useState(String(user.points ?? 0));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!name.trim()) { setErr('昵称不能为空'); return; }
    if (!/^-?\d+$/.test(points.trim())) { setErr('积分需为整数'); return; }
    setSaving(true);
    setErr('');
    const res = await editUser({
      id: user.id,
      name: name.trim(),
      role: role as 'user' | 'moderator',
      points: Number(points.trim()),
    });
    setSaving(false);
    if (!res.ok) { setErr(res.error || '保存失败，请重试'); return; }
    router.refresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-[480px] max-w-full flex-col bg-white" style={{ animation: 'drawer-in 0.25s ease-out' }}>
        <div className="flex h-14 items-center justify-between border-b border-[#E5E6EB] px-5">
          <h2 className="text-base font-semibold text-[#1F2329]">编辑用户资料</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-[#646A73] transition-colors hover:bg-[#F8FAFC] hover:text-[#1F2329]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#1F2329]">用户 ID</label>
            <div className="rounded-md border border-[#E5E6EB] bg-[#F8FAFC] px-3 py-2 font-mono text-xs text-[#646A73]">{user.id}</div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#1F2329]">昵称 <span className="text-[#F54A45]">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="h-9 w-full rounded-md border border-[#E5E6EB] bg-white px-3 text-sm text-[#1F2329] outline-none transition-colors focus:border-[#006855]" placeholder="请输入昵称" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#1F2329]">角色</label>
            <select value={role} onChange={(e) => setRole(e.target.value as 'user' | 'moderator')} className="h-9 w-full rounded-md border border-[#E5E6EB] bg-white px-3 text-sm text-[#1F2329] outline-none transition-colors focus:border-[#006855]">
              <option value="user">普通用户</option>
              <option value="moderator">版主</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#1F2329]">积分</label>
            <input value={points} onChange={(e) => setPoints(e.target.value)} className="h-9 w-full rounded-md border border-[#E5E6EB] bg-white px-3 text-sm text-[#1F2329] outline-none transition-colors focus:border-[#006855]" placeholder="请输入积分" />
          </div>
          {err && <div className="rounded-md bg-[#FDEAEA] px-3 py-2 text-sm text-[#F54A45]">{err}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#E5E6EB] px-5 py-3">
          <button onClick={onClose} className="h-9 rounded-md border border-[#E5E6EB] px-4 text-sm text-[#646A73] transition-colors hover:bg-[#F8FAFC]">取消</button>
          <button onClick={submit} disabled={saving} className="h-9 rounded-md bg-[#006855] px-4 text-sm font-medium text-white transition-colors hover:bg-[#005447] disabled:opacity-60">
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
