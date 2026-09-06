'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Sparkles } from 'lucide-react';
import type { ActivityItem } from '../activity.types';
import { saveActivityAction } from '../actions';

const kindLabel: Record<string, string> = {
  activity: '活动',
  notice: '公告',
  banner: 'Banner',
};

const inputCls =
  'w-full rounded-md border border-[#E5E6EB] bg-white px-3 py-2 text-[13px] text-[#1F2329] outline-none transition-colors focus:border-[#006855]';

interface Props {
  mode: 'add' | 'edit';
  item?: ActivityItem;
  onClose: () => void;
}

/** 新增 / 编辑活动抽屉（保存走 Server Action，成功后刷新并关闭） */
export function ActivityDrawer({ mode, item, onClose }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    kind: (item?.kind || 'activity') as 'activity' | 'notice' | 'banner',
    title: item?.title || '',
    description: item?.description || '',
    sort: item?.sort ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    if (!form.title.trim()) { setErr('请填写标题'); return; }
    setSaving(true);
    setErr('');
    const res = await saveActivityAction({
      id: mode === 'edit' ? item?.id : undefined,
      kind: form.kind,
      title: form.title,
      description: form.description,
      sort: form.sort,
      active: mode === 'edit' ? !!item?.active : true,
    });
    setSaving(false);
    if (!res.ok) { setErr(res.error || '保存失败'); return; }
    router.refresh();
    onClose();
  };

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-[480px] flex-col bg-white" style={{ animation: 'drawer-in .25s ease-out' }}>
        <div className="flex items-center justify-between border-b border-[#F0F1F3] px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#006855]" />
            <h3 className="text-[15px] font-semibold text-[#1F2329]">{mode === 'add' ? '新增活动' : '编辑活动'}</h3>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-[#646A73] transition-colors hover:bg-[#F1F5F9]" aria-label="关闭">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <label className="mb-1 block text-xs text-[#646A73]">类型 <span className="text-[#F54A45]">*</span></label>
            <select value={form.kind} onChange={(e) => set({ kind: e.target.value as 'activity' | 'notice' | 'banner' })} className={inputCls}>
              {Object.entries(kindLabel).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#646A73]">标题 <span className="text-[#F54A45]">*</span></label>
            <input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="请输入标题" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#646A73]">描述</label>
            <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={3} placeholder="请输入描述" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#646A73]">排序</label>
            <input type="number" value={form.sort} onChange={(e) => set({ sort: Number(e.target.value) || 0 })} className={inputCls} />
          </div>
          {err && <div className="rounded-md bg-[#FDEAEA] px-3 py-2 text-[13px] text-[#F54A45]">{err}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#F0F1F3] px-5 py-4">
          <button onClick={onClose} className="h-9 rounded-md border border-[#E5E6EB] px-4 text-[13px] text-[#1F2329] transition-colors hover:bg-[#F8FAFC]">
            取消
          </button>
          <button onClick={save} disabled={saving} className="h-9 rounded-md bg-[#006855] px-4 text-[13px] text-white transition-colors hover:bg-[#005547] disabled:opacity-50">
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </>
  );
}
