'use client';

import type { ProductItem } from '@/lib/repos/product-repo';

/** 商品详情抽屉（纯展示，数据来自 RSC props） */
export function ProductDetailDrawer({ item, onClose }: { item: ProductItem; onClose: () => void }) {
  const fields: [string, string][] = [
    ['标题', item.title],
    ['类型', item.commercial ? '商业推广' : item.kind],
    ['作者', item.authorName],
    ['佣金', item.commission != null ? String(item.commission) : '—'],
    ['推广类型', item.promoType || '—'],
    ['状态', item.status],
    ['发布时间', (item.createdAt || '').slice(0, 10)],
  ];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 flex h-full w-[480px] flex-col bg-white shadow-none" style={{ animation: 'drawer-in .25s ease-out' }}>
        <div className="flex items-center justify-between border-b border-[#E5E6EB] px-5 py-4">
          <h3 className="text-[15px] font-semibold text-[#1F2329]">商品详情</h3>
          <button onClick={onClose} className="rounded-md p-1 text-[#646A73] transition-colors hover:bg-[#F1F5F9]" aria-label="关闭">
            ✕
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {fields.map(([k, v]) => (
            <div key={k}>
              <p className="text-[12px] text-[#646A73]">{k}</p>
              <p className="mt-0.5 text-[13px] text-[#1F2329]">{v}</p>
            </div>
          ))}
          <div>
            <p className="text-[12px] text-[#646A73]">商品链接</p>
            <p className="mt-0.5 break-all font-mono text-[12px] text-[#006855]">{item.url || '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
