'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Plus } from 'lucide-react';
import type { ActivityPageParams } from '../activity.types';

const selectCls =
  'h-9 rounded-md border border-[#E5E6EB] bg-white px-3 text-[13px] text-[#1F2329] outline-none transition-colors focus:border-[#006855]';

/** 筛选栏：类型 + 搜索 + 新增按钮。URL searchParams 驱动 RSC */
export function ActivityFilters({
  current,
  onAdd,
}: {
  current: ActivityPageParams;
  onAdd: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [kw, setKw] = useState(current.q ?? '');

  const apply = (patch: Partial<ActivityPageParams>, resetPage = true) => {
    const merged: ActivityPageParams = { ...current, ...patch };
    if (resetPage) delete merged.page;
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== 'all' && v !== '') sp.set(k, v);
    }
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex items-center gap-3 border-b border-[#F0F1F3] p-4">
      <select value={current.kind ?? 'all'} onChange={(e) => apply({ kind: e.target.value })} className={selectCls}>
        <option value="all">全部类型</option>
        <option value="activity">活动</option>
        <option value="notice">公告</option>
        <option value="banner">Banner</option>
      </select>
      <div className="flex flex-1 items-center gap-2 rounded-md border border-[#E5E6EB] bg-white px-3 focus-within:border-[#006855]">
        <Search className="h-4 w-4 text-[#9AA0A6]" />
        <input
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') apply({ q: kw }); }}
          placeholder="搜索标题或描述"
          className="h-9 w-full bg-transparent text-[13px] text-[#1F2329] outline-none placeholder:text-[#9AA0A6]"
        />
      </div>
      <button
        onClick={onAdd}
        className="flex h-9 items-center gap-1.5 rounded-md bg-[#006855] px-4 text-[13px] text-white transition-colors hover:bg-[#005547]"
      >
        <Plus className="h-4 w-4" /> 新增活动
      </button>
    </div>
  );
}
