'use client';

import { useRouter } from 'next/navigation';
import { Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReportItem } from '@/modules/report';

const statusMeta: Record<string, { label: string; cls: string }> = {
  pending: { label: '待处理', cls: 'bg-[#FFF4E6] text-[#FF8800]' },
  approved: { label: '已通过', cls: 'bg-[#E6F7F0] text-[#00A870]' },
  rejected: { label: '已驳回', cls: 'bg-[#FDEBEA] text-[#F54A45]' },
};

interface Props {
  rows: ReportItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onView: (r: ReportItem) => void;
}

export function ReportTable({ rows, total, page, pageSize, totalPages, onView }: Props) {
  const router = useRouter();

  const go = (patch: { page?: number; size?: number }) => {
    const sp = new URLSearchParams(window.location.search);
    if (patch.page !== undefined) sp.set('page', String(patch.page));
    if (patch.size !== undefined) sp.set('size', String(patch.size));
    const qs = sp.toString();
    router.push(qs ? `/report?${qs}` : '/report');
  };

  return (
    <div className="rounded-lg border border-[#E5E6EB] bg-white">
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#9AA0A6]">
          <Inbox className="mb-3 h-10 w-10" />
          <div className="text-sm">暂无数据</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1024px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#E5E6EB] text-[#646A73]">
                <th className="h-12 px-4 font-medium">举报编号</th>
                <th className="w-20 px-2 font-medium">内容类型</th>
                <th className="w-28 px-2 font-medium">举报原因</th>
                <th className="w-24 px-2 font-medium">举报人</th>
                <th className="w-28 px-2 font-medium">被举报人</th>
                <th className="w-20 px-2 font-medium">状态</th>
                <th className="w-24 px-2 font-medium">重复举报</th>
                <th className="w-32 px-2 font-medium">举报时间</th>
                <th className="w-28 px-4 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st = statusMeta[r.status] || statusMeta.pending;
                return (
                  <tr key={r.id} className="h-12 border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                    <td className="px-4 font-mono text-[13px] text-[#006855]">{r.reportNo}</td>
                    <td className="px-2 text-[#1F2329]">{r.contentType}</td>
                    <td className="px-2 text-[#1F2329]">{r.reason}</td>
                    <td className="px-2 text-[#1F2329]">{r.reporterName}</td>
                    <td className="px-2 text-[#646A73]">{r.targetName}</td>
                    <td className="px-2">
                      <span className={`rounded px-2 py-1 text-xs ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-2 text-[#EA1A0F]">{r.repeatCount > 1 ? `×${r.repeatCount}` : '—'}</td>
                    <td className="px-2 font-mono text-xs text-[#646A73]">
                      {(r.createdAt || '').slice(0, 16).replace('T', ' ')}
                    </td>
                    <td className="px-4">
                      <button
                        onClick={() => onView(r)}
                        className="rounded-lg border border-[#006855] px-2.5 py-1 text-xs text-[#006855] transition-colors hover:bg-[#006855] hover:text-white"
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 分页 */}
      <div className="flex items-center justify-between border-t border-[#E5E6EB] px-4 py-3 text-sm text-[#646A73]">
        <div className="flex items-center gap-2">
          共 {total} 条
          <select
            value={pageSize}
            onChange={(e) => go({ size: Number(e.target.value), page: 1 })}
            className="ml-1 h-7 rounded border border-[#E5E6EB] bg-white px-2 text-xs text-[#1F2329] outline-none"
          >
            {[20, 50, 100].map((n) => (
              <option key={n} value={n}>{n}条/页</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => go({ page: page - 1 })}
            className="flex h-7 w-7 items-center justify-center rounded border border-[#E5E6EB] text-[#646A73] transition-colors hover:bg-[#F1F5F9] disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2">{page}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => go({ page: page + 1 })}
            className="flex h-7 w-7 items-center justify-center rounded border border-[#E5E6EB] text-[#646A73] transition-colors hover:bg-[#F1F5F9] disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
