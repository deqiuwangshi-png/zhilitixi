'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import type { ProductPageParams } from '../product-gov.types';

const selectCls =
  'h-8 rounded-md border border-[#E5E6EB] bg-white px-2 text-[13px] text-[#1F2329] outline-none transition-colors focus:border-[#006855]';

/** 筛选栏：类型/状态/搜索。URL searchParams 驱动 RSC */
export function ProductFilters({ current }: { current: ProductPageParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const [kw, setKw] = useState(current.q ?? '');

  const apply = (patch: Partial<ProductPageParams>, resetPage = true) => {
    const merged: ProductPageParams = { ...current, ...patch };
    if (resetPage) delete merged.page;
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== 'all' && v !== '') sp.set(k, v);
    }
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex items-center gap-2">
      <select value={current.type ?? 'all'} onChange={(e) => apply({ type: e.target.value })} className={selectCls}>
        <option value="all">类型：全部</option>
        <option value="commercial">商业化商品</option>
        <option value="square">链接帖子</option>
      </select>
      <select value={current.status ?? 'all'} onChange={(e) => apply({ status: e.target.value })} className={selectCls}>
        <option value="all">状态：全部</option>
        <option value="up">上架</option>
        <option value="down">下架</option>
      </select>
      <div className="flex h-8 items-center rounded-md border border-[#E5E6EB] bg-white px-2 focus-within:border-[#006855]">
        <Search className="h-4 w-4 text-[#9AA0A6]" />
        <input
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') apply({ q: kw }); }}
          placeholder="搜索标题或作者"
          className="ml-1.5 w-40 bg-transparent text-[13px] text-[#1F2329] outline-none placeholder:text-[#9AA0A6]"
        />
      </div>
    </div>
  );
}
