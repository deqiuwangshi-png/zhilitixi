'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import type { ReportPageParams } from '@/app/(dashboard)/report/page';

const selectCls =
  'h-9 rounded-lg border border-[#E5E6EB] bg-white px-3 text-sm text-[#1F2329] outline-none transition-colors focus:border-[#006855]';

const reasons = ['全部', '垃圾广告', '色情内容', '冒充他人', '政治敏感', '人身攻击'];
const contentTypes = ['全部', '评论', '帖子', '用户'];

/** 筛选栏：状态/内容类型/举报原因/重复举报 + 搜索。URL searchParams 驱动 RSC */
export function ReportFilters({ current }: { current: ReportPageParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const [kw, setKw] = useState(current.q ?? '');

  const apply = (patch: Partial<ReportPageParams>, resetPage = true) => {
    const merged: ReportPageParams = { ...current, ...patch };
    if (resetPage) delete merged.page;
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== 'all' && v !== '全部' && v !== '') sp.set(k, v);
    }
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#E5E6EB] bg-white p-4">
      <select value={current.status ?? 'all'} onChange={(e) => apply({ status: e.target.value })} className={selectCls}>
        <option value="all">状态：全部</option>
        <option value="pending">待处理</option>
        <option value="approved">已通过</option>
        <option value="rejected">已驳回</option>
      </select>
      <select value={current.type ?? '全部'} onChange={(e) => apply({ type: e.target.value })} className={selectCls}>
        {contentTypes.map((t) => (
          <option key={t} value={t}>内容类型：{t}</option>
        ))}
      </select>
      <select value={current.reason ?? '全部'} onChange={(e) => apply({ reason: e.target.value })} className={selectCls}>
        {reasons.map((t) => (
          <option key={t} value={t}>举报原因：{t}</option>
        ))}
      </select>
      <select value={current.repeat ?? 'all'} onChange={(e) => apply({ repeat: e.target.value })} className={selectCls}>
        <option value="all">重复举报：全部</option>
        <option value="repeat">重复≥2次</option>
      </select>

      <div className="flex h-9 flex-1 min-w-[220px] items-center gap-2 rounded-lg border border-[#E5E6EB] bg-white px-3 focus-within:border-[#006855]">
        <input
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') apply({ q: kw }); }}
          placeholder="搜索举报编号/举报人/被举报人"
          className="h-full flex-1 bg-transparent text-sm text-[#1F2329] outline-none placeholder:text-[#9AA0A6]"
        />
        <button onClick={() => apply({ q: kw })} aria-label="搜索" className="text-[#646A73] transition-colors hover:text-[#006855]">
          <Search className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
