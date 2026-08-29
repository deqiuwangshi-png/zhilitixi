'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Pencil, Trash2, Inbox, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProductItem } from '@/lib/repos/product-repo';
import { removeProduct } from '@/lib/actions/product-actions';

interface Props {
  rows: ProductItem[];
  total: number;
  page: number;
  totalPages: number;
  onView: (r: ProductItem) => void;
  onEdit: (r: ProductItem) => void;
}

export function ProductTable({ rows, total, page, totalPages, onView, onEdit }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const go = (p: number) => {
    const sp = new URLSearchParams(window.location.search);
    sp.set('page', String(p));
    const qs = sp.toString();
    router.push(qs ? `/product-gov?${qs}` : '/product-gov');
  };

  const remove = async (r: ProductItem) => {
    if (!window.confirm(`确认删除「${r.title}」？此操作不可撤销。`)) return;
    setBusyId(r.id);
    const res = await removeProduct({ source: r.source, id: r.id });
    setBusyId(null);
    if (!res.ok) {
      alert(res.error || '删除失败');
      return;
    }
    router.refresh();
  };

  return (
    <div className="rounded-lg border border-[#E5E6EB] bg-white">
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[#9AA0A6]">
          <Inbox className="h-10 w-10" />
          <p className="mt-3 text-[13px]">暂无数据</p>
        </div>
      ) : (
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="h-12 border-b border-[#F0F1F3] text-[12px] text-[#646A73]">
              <th className="px-5 font-medium">标题</th>
              <th className="px-4 font-medium">类型</th>
              <th className="px-4 font-medium">作者</th>
              <th className="px-4 font-medium">佣金</th>
              <th className="px-4 font-medium">状态</th>
              <th className="px-4 font-medium">发布时间</th>
              <th className="px-5 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.source}-${r.id}`} className="h-12 border-b border-[#F0F1F3] text-[13px] transition-colors hover:bg-[#F8FAFC]">
                <td className="max-w-[260px] truncate px-5 text-[#1F2329]">{r.title}</td>
                <td className="px-4">
                  <span className="rounded bg-[#F7F8FA] px-1.5 py-0.5 text-[12px] text-[#646A73]">
                    {r.commercial ? '商业推广' : r.kind}
                  </span>
                </td>
                <td className="px-4 text-[#646A73]">{r.authorName}</td>
                <td className="px-4 tabular-nums text-[#1F2329]">{r.commission != null ? `${r.commission}` : '—'}</td>
                <td className="px-4">
                  <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[12px] ${
                    r.status === '上架' ? 'bg-[#E8F5F1] text-[#006855]' : 'bg-[#FDEBEA] text-[#F54A45]'
                  }`}>
                    {r.status === '上架' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {r.status}
                  </span>
                </td>
                <td className="px-4 font-mono text-[12px] text-[#646A73]">{(r.createdAt || '').slice(0, 10)}</td>
                <td className="px-5">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onView(r)} title="查看详情" className="rounded-md p-1.5 text-[#646A73] transition-colors hover:bg-[#F1F5F9] hover:text-[#006855]">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button onClick={() => onEdit(r)} title="编辑" className="rounded-md p-1.5 text-[#646A73] transition-colors hover:bg-[#F1F5F9] hover:text-[#006855]">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(r)} disabled={busyId === r.id} title="删除" className="rounded-md p-1.5 text-[#646A73] transition-colors hover:bg-[#FDEBEA] hover:text-[#F54A45] disabled:opacity-40">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex items-center justify-between border-t border-[#F0F1F3] px-5 py-3">
        <p className="text-[12px] text-[#646A73]">共 {total} 条</p>
        <div className="flex items-center gap-2 text-[13px]">
          <button disabled={page <= 1} onClick={() => go(page - 1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E5E6EB] text-[#646A73] transition-colors hover:bg-[#F7F8FA] disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[#1F2329]">第 {page} / {totalPages} 页</span>
          <button disabled={page >= totalPages} onClick={() => go(page + 1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E5E6EB] text-[#646A73] transition-colors hover:bg-[#F7F8FA] disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
