'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ActivityItem } from '../activity.types';
import { toggleActivityAction, removeActivityAction } from '../actions';

const kindLabel: Record<string, string> = {
  activity: '活动',
  notice: '公告',
  banner: 'Banner',
};

interface Props {
  rows: ActivityItem[];
  total: number;
  page: number;
  totalPages: number;
  onEdit: (a: ActivityItem) => void;
}

export function ActivityTable({ rows, total, page, totalPages, onEdit }: Props) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const go = (p: number) => {
    const sp = new URLSearchParams(window.location.search);
    sp.set('page', String(p));
    const qs = sp.toString();
    router.push(qs ? `/activity?${qs}` : '/activity');
  };

  const toggle = async (a: ActivityItem) => {
    setBusyKey(`t-${a.id}`);
    const res = await toggleActivityAction({ id: a.id, active: !!a.active });
    setBusyKey(null);
    if (!res.ok) { alert(res.error || '操作失败'); return; }
    router.refresh();
  };

  const remove = async (a: ActivityItem) => {
    if (!window.confirm(`确定删除「${a.title ?? '未命名'}」吗？该操作不可恢复。`)) return;
    setBusyKey(`d-${a.id}`);
    const res = await removeActivityAction({ id: a.id });
    setBusyKey(null);
    if (!res.ok) { alert(res.error || '删除失败'); return; }
    router.refresh();
  };

  return (
    <div className="rounded-lg border border-[#E5E6EB] bg-white">
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[#9AA0A6]">
          <Inbox className="h-10 w-10" />
          <p className="mt-3 text-sm">暂无数据</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#F0F1F3] text-left text-xs text-[#646A73]">
              <th className="px-5 py-3 font-medium">标题</th>
              <th className="px-5 py-3 font-medium">类型</th>
              <th className="px-5 py-3 font-medium">排序</th>
              <th className="px-5 py-3 font-medium">状态</th>
              <th className="px-5 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F1F3]">
            {rows.map((a) => (
              <tr key={a.id} className="h-12 transition-colors hover:bg-[#F8FAFC]">
                <td className="px-5 py-2">
                  <div className="max-w-[360px]">
                    <p className="truncate text-[13px] font-medium text-[#1F2329]">{a.title || '未命名'}</p>
                    <p className="truncate text-xs text-[#646A73]">{a.description}</p>
                  </div>
                </td>
                <td className="px-5 py-2">
                  <span className="rounded bg-[#EEF1F4] px-1.5 py-0.5 text-[11px] text-[#646A73]">
                    {kindLabel[a.kind ?? ''] ?? a.kind ?? '-'}
                  </span>
                </td>
                <td className="px-5 py-2 text-[13px] tabular-nums text-[#646A73]">{a.sort ?? 0}</td>
                <td className="px-5 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-[11px] ${a.active ? 'bg-[#E6F7F0] text-[#00A870]' : 'bg-[#EEF1F4] text-[#646A73]'}`}>
                    {a.active ? '上架中' : '已下线'}
                  </span>
                </td>
                <td className="px-5 py-2">
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => onEdit(a)} className="flex h-7 items-center gap-1 rounded-md border border-[#E5E6EB] px-2 text-[12px] text-[#3370FF] transition-colors hover:bg-[#EEF4FF]">
                      <Pencil className="h-3 w-3" /> 编辑
                    </button>
                    <button onClick={() => toggle(a)} disabled={busyKey === `t-${a.id}`} className="h-7 rounded-md border border-[#E5E6EB] px-2 text-[12px] text-[#646A73] transition-colors hover:bg-[#F8FAFC] disabled:opacity-40">
                      {a.active ? '下架' : '上架'}
                    </button>
                    <button onClick={() => remove(a)} disabled={busyKey === `d-${a.id}`} className="flex h-7 items-center gap-1 rounded-md border border-[#E5E6EB] px-2 text-[12px] text-[#F54A45] transition-colors hover:bg-[#FDEBEA] disabled:opacity-40">
                      <Trash2 className="h-3 w-3" /> 删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex items-center justify-between border-t border-[#F0F1F3] px-5 py-3 text-[12px] text-[#646A73]">
        <span>共 {total} 条 · 每页 10 条</span>
        <div className="flex items-center gap-1">
          <button disabled={page <= 1} onClick={() => go(page - 1)} className="flex h-7 w-7 items-center justify-center rounded border border-[#E5E6EB] transition-colors hover:bg-[#F7F8FA] disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-1 tabular-nums">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => go(page + 1)} className="flex h-7 w-7 items-center justify-center rounded border border-[#E5E6EB] transition-colors hover:bg-[#F7F8FA] disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
