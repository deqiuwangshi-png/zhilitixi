'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductItem } from '@/lib/repos/product-repo';
import { saveProduct } from '@/lib/actions/product-actions';

const inputCls =
  'w-full rounded-md border border-[#E5E6EB] bg-white px-3 py-2 text-[13px] text-[#1F2329] outline-none transition-colors focus:border-[#006855]';

/** 编辑商品抽屉：表单走 Server Action 保存，成功后刷新并关闭 */
export function ProductEditDrawer({ item, onClose }: { item: ProductItem; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: item.title,
    kind: item.kind,
    commission: item.commission != null ? String(item.commission) : '',
    promoType: item.promoType,
    url: item.url,
    commercial: item.commercial,
    status: item.status,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    if (!form.title.trim()) { setErr('标题为必填项'); return; }
    setSaving(true);
    setErr('');
    const res = await saveProduct({
      source: item.source,
      id: item.id,
      title: form.title,
      kind: form.kind,
      commission: form.commission === '' ? null : form.commission,
      promoType: form.promoType,
      url: form.url,
      commercial: item.source === 'discovery' ? form.commercial : undefined,
      status: form.status,
    });
    setSaving(false);
    if (!res.ok) { setErr(res.error || '保存失败'); return; }
    router.refresh();
    onClose();
  };

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 flex h-full w-[480px] flex-col bg-white" style={{ animation: 'drawer-in .25s ease-out' }}>
        <div className="flex items-center justify-between border-b border-[#E5E6EB] px-5 py-4">
          <h3 className="text-[15px] font-semibold text-[#1F2329]">编辑商品</h3>
          <button onClick={onClose} className="rounded-md p-1 text-[#646A73] transition-colors hover:bg-[#F1F5F9]" aria-label="关闭">
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <Field label="标题 *">
            <input className={inputCls} value={form.title} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <Field label="分类">
            <input className={inputCls} value={form.kind} onChange={(e) => set({ kind: e.target.value })} />
          </Field>
          <Field label="佣金">
            <input className={inputCls} value={form.commission} onChange={(e) => set({ commission: e.target.value })} />
          </Field>
          <Field label="推广类型">
            <input className={inputCls} value={form.promoType} onChange={(e) => set({ promoType: e.target.value })} />
          </Field>
          <Field label="商品链接">
            <input className={inputCls} value={form.url} onChange={(e) => set({ url: e.target.value })} />
          </Field>
          {item.source === 'discovery' && (
            <label className="flex items-center gap-2 text-[13px] text-[#1F2329]">
              <input type="checkbox" checked={form.commercial} onChange={(e) => set({ commercial: e.target.checked })} />
              标记为商业推广内容
            </label>
          )}
          <Field label="状态">
            <select className={inputCls} value={form.status} onChange={(e) => set({ status: e.target.value as '上架' | '下架' })}>
              <option value="上架">上架</option>
              <option value="下架">下架</option>
            </select>
          </Field>
          {err && <div className="rounded-md bg-[#FDEAEA] px-3 py-2 text-[13px] text-[#F54A45]">{err}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#E5E6EB] px-5 py-4">
          <button onClick={onClose} className="rounded-md border border-[#E5E6EB] px-4 py-2 text-[13px] text-[#646A73] transition-colors hover:bg-[#F7F8FA]">
            取消
          </button>
          <button onClick={save} disabled={saving} className="rounded-md bg-[#006855] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#005646] disabled:opacity-50">
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-medium text-[#1F2329]">{label}</label>
      {children}
    </div>
  );
}
