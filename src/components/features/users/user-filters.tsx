'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import type { UserPageParams } from '@/app/(dashboard)/user-management/page';

const selectCls =
  'h-8 rounded-md border border-[#E5E6EB] bg-white px-2.5 text-sm text-[#1F2329] outline-none transition-colors focus:border-[#006855]';

/** 筛选栏：状态/角色/异常 + 搜索。改动通过 URL searchParams 驱动 RSC 重渲染 */
export function UserFilters({ current }: { current: UserPageParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const [kw, setKw] = useState(current.q ?? '');

  const apply = (patch: Partial<UserPageParams>, resetPage = true) => {
    const merged: UserPageParams = { ...current, ...patch };
    if (resetPage) delete merged.page;
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== 'all' && v !== '') sp.set(k, v);
    }
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#E5E6EB] bg-white p-3">
      <select value={current.status ?? 'all'} onChange={(e) => apply({ status: e.target.value })} className={selectCls}>
        <option value="all">全部状态</option>
        <option value="normal">正常</option>
        <option value="limited">限流</option>
        <option value="banned">封禁</option>
      </select>
      <select value={current.role ?? 'all'} onChange={(e) => apply({ role: e.target.value })} className={selectCls}>
        <option value="all">全部角色</option>
        <option value="user">普通用户</option>
        <option value="moderator">版主</option>
      </select>
      <select value={current.anomaly ?? 'all'} onChange={(e) => apply({ anomaly: e.target.value })} className={selectCls}>
        <option value="all">全部异常标记</option>
        <option value="yes">有异常标记</option>
        <option value="no">无异常标记</option>
      </select>

      <div className="flex items-center gap-1.5">
        <input
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') apply({ q: kw }); }}
          placeholder="搜索昵称"
          className="h-8 w-44 rounded-md border border-[#E5E6EB] bg-white px-3 text-sm text-[#1F2329] outline-none transition-colors focus:border-[#006855]"
        />
        <button
          onClick={() => apply({ q: kw })}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-[#006855] text-white transition-colors hover:bg-[#005447]"
          aria-label="搜索"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
