'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import type { ReviewPageParams } from '@/modules/content-review';

const selectCls =
  'h-9 rounded-lg border border-[#E5E6EB] bg-white px-3 text-sm text-[#1F2329] outline-none transition-colors focus:border-[#006855]';

/** 筛选栏：状态/类型/分类 + 关键词搜索。URL searchParams 驱动 RSC 重渲染 */
export function ReviewFilters({
  current,
  categories,
}: {
  current: ReviewPageParams;
  categories: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [kw, setKw] = useState(current.q ?? '');

  const apply = (patch: Partial<ReviewPageParams>, resetPage = true) => {
    const merged: ReviewPageParams = { ...current, ...patch };
    if (resetPage) delete merged.page;
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== 'all' && v !== '') sp.set(k, v);
    }
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#E5E6EB] bg-white p-4">
      <select value={current.status ?? 'all'} onChange={(e) => apply({ status: e.target.value })} className={selectCls}>
        <option value="all">状态：全部</option>
        <option value="pending">待审核</option>
        <option value="approved">已通过</option>
        <option value="rejected">已驳回</option>
      </select>
      <select value={current.type ?? 'all'} onChange={(e) => apply({ type: e.target.value })} className={selectCls}>
        <option value="all">内容类型：全部</option>
        <option value="发现">发现</option>
        <option value="市集">市集</option>
        <option value="URL">URL</option>
      </select>
      <select value={current.category ?? 'all'} onChange={(e) => apply({ category: e.target.value })} className={selectCls}>
        <option value="all">分类：全部</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <div className="flex h-9 flex-1 min-w-[220px] items-center gap-2 rounded-lg border border-[#E5E6EB] bg-white px-3 focus-within:border-[#006855]">
        <input
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') apply({ q: kw }); }}
          placeholder="搜索标题或作者"
          className="h-full flex-1 bg-transparent text-sm text-[#1F2329] outline-none placeholder:text-[#9AA0A6]"
        />
        <button onClick={() => apply({ q: kw })} aria-label="搜索" className="text-[#646A73] transition-colors hover:text-[#006855]">
          <Search className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
