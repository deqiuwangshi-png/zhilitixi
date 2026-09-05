'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { handleRiskAction } from '@/lib/actions/risk-actions';

/** 新增域名规则抽屉（保存走 Server Action） */
export function RiskAddDrawer({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ domain: '', kind: 'trusted', note: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!form.domain.trim()) { setErr('域名必填'); return; }
    setSaving(true);
    setErr('');
    const res = await handleRiskAction({
      type: 'domain',
      action: 'upsert',
      domain: form.domain.trim(),
      kind: form.kind as 'trusted' | 'blocked',
      note: form.note.trim() || '人工配置',
    });
    setSaving(false);
    if (!res.ok) { setErr(res.error || '保存失败'); return; }
    router.refresh();
    onClose();
  };

  const inputCls =
    'h-9 w-full rounded-md border border-[#E5E6EB] px-3 text-[13px] text-[#1F2329] outline-none transition-colors focus:border-[#006855]';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="flex h-full w-[480px] flex-col bg-white"
        style={{ animation: 'drawer-in .25s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#F0F1F3] px-5 py-4">
          <h3 className="text-[15px] font-semibold text-[#1F2329]">新增域名规则</h3>
          <button onClick={onClose} className="rounded-md p-1 text-[#646A73] transition-colors hover:bg-[#F7F8FA]" aria-label="关闭">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div>
            <label className="mb-1.5 block text-[13px] text-[#1F2329]">域名 <span className="text-[#F54A45]">*</span></label>
            <input
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
              placeholder="example.com"
              className={`${inputCls} font-mono`}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] text-[#1F2329]">类型 <span className="text-[#F54A45]">*</span></label>
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={`${inputCls} bg-white`}>
              <option value="trusted">白名单</option>
              <option value="blocked">黑名单</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] text-[#1F2329]">备注</label>
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="如：代码托管、视频"
              className={inputCls}
            />
          </div>
          {err && <div className="rounded-md bg-[#FDEAEA] px-3 py-2 text-[13px] text-[#F54A45]">{err}</div>}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#F0F1F3] px-5 py-4">
          <button onClick={onClose} className="rounded-md border border-[#E5E6EB] px-4 py-2 text-[13px] text-[#1F2329] transition-colors hover:bg-[#F7F8FA]">
            取消
          </button>
          <button onClick={submit} disabled={saving || !form.domain.trim()} className="rounded-md bg-[#006855] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#005A4B] disabled:opacity-40">
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
