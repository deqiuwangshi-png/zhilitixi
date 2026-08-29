'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Inbox, ExternalLink, ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ContentItem } from '@/lib/repos/content-repo';
import { reviewContent, batchReviewContent } from '@/lib/actions/review-actions';

const statusMeta: Record<string, { label: string; cls: string }> = {
  pending: { label: '待审核', cls: 'bg-[#FFF4E6] text-[#FF8800]' },
  approved: { label: '已通过', cls: 'bg-[#E6F7F0] text-[#00A870]' },
  rejected: { label: '已驳回', cls: 'bg-[#FDEBEA] text-[#F54A45]' },
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

interface Props {
  rows: ContentItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const rowKey = (r: ContentItem) => `${r.source}-${r.id}`;

export function ReviewTable({ rows, total, page, pageSize, totalPages }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const go = (patch: { page?: number; size?: number }) => {
    const sp = new URLSearchParams(window.location.search);
    if (patch.page !== undefined) sp.set('page', String(patch.page));
    if (patch.size !== undefined) sp.set('size', String(patch.size));
    const qs = sp.toString();
    router.push(qs ? `/content-review?${qs}` : '/content-review');
  };

  const act = async (r: ContentItem, action: 'approve' | 'reject') => {
    let reason = '';
    if (action === 'reject') {
      reason = window.prompt('请输入驳回原因（可留空使用默认）', '已驳回') ?? '';
    }
    setBusy(true);
    const res = await reviewContent({ source: r.source, id: r.id, action, reason });
    setBusy(false);
    if (!res.ok) {
      alert(res.error || '操作失败');
      return;
    }
    router.refresh();
  };

  const batchAct = async (action: 'approve' | 'reject') => {
    const targets = rows.filter((r) => selected.has(rowKey(r)));
    if (targets.length === 0) return;
    let reason = '批量审核';
    if (action === 'reject') {
      reason = window.prompt('请输入驳回原因（应用于全部选中项，可留空使用默认）', '已驳回') ?? '';
    }
    setBusy(true);
    const res = await batchReviewContent(
      targets.map((r) => ({ source: r.source, id: r.id, action, reason }))
    );
    setBusy(false);
    if (!res.ok) {
      alert(res.error || '批量操作失败');
      return;
    }
    setSelected(new Set());
    router.refresh();
  };

  const toggleSelected = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(rowKey(r)));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map(rowKey)));

  return (
    <>
      {/* 批量操作栏 */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-[#E8F5F1] bg-[#F4FBF9] px-4 py-3">
          <span className="text-sm font-medium text-[#006855]">已选 {selected.size} 项</span>
          <div className="flex items-center gap-2">
            <button onClick={() => batchAct('approve')} disabled={busy} className="inline-flex items-center gap-1 rounded-md bg-[#006855] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#005643] disabled:opacity-60">
              <Check className="h-3.5 w-3.5" /> 批量通过
            </button>
            <button onClick={() => batchAct('reject')} disabled={busy} className="inline-flex items-center gap-1 rounded-md border border-[#F54A45] px-3 py-1.5 text-xs font-medium text-[#F54A45] transition-colors hover:bg-[#FEF2F1] disabled:opacity-60">
              <X className="h-3.5 w-3.5" /> 批量驳回
            </button>
          </div>
        </div>
      )}

      {/* 表格 */}
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
                  <th className="h-12 w-12 px-4 font-medium">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-[#006855]" />
                  </th>
                  <th className="px-2 font-medium">标题</th>
                  <th className="w-16 px-2 font-medium">类型</th>
                  <th className="px-2 font-medium">摘要</th>
                  <th className="w-20 px-2 font-medium">图片</th>
                  <th className="w-20 px-2 font-medium">作者</th>
                  <th className="w-24 px-2 font-medium">分类</th>
                  <th className="w-20 px-2 font-medium">状态</th>
                  <th className="w-16 px-2 font-medium">浏览</th>
                  <th className="w-28 px-2 font-medium">发布时间</th>
                  <th className="w-32 px-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = statusMeta[r.status] || statusMeta.pending;
                  return (
                    <tr key={rowKey(r)} className="h-12 border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                      <td className="px-4" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(rowKey(r))} onChange={() => toggleSelected(rowKey(r))} className="h-4 w-4 accent-[#006855]" />
                      </td>
                      <td className="px-2">
                        <span className="flex items-center gap-1.5 text-[#1F2329]">
                          <span className="max-w-[180px] truncate">{r.title}</span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#9AA0A6]" />
                        </span>
                      </td>
                      <td className="px-2">
                        <span className="rounded bg-[#F1F5F9] px-2 py-1 text-xs text-[#646A73]">{r.typeKind}</span>
                      </td>
                      <td className="px-2">
                        <span className="block max-w-[220px] truncate text-[#646A73]">{r.summary || '—'}</span>
                      </td>
                      <td className="px-2">
                        {r.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.image} alt="" className="h-9 w-9 rounded object-cover" />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded bg-[#F1F5F9] text-[#C0C4CC]">
                            <ImageIcon className="h-4 w-4" />
                          </span>
                        )}
                      </td>
                      <td className="px-2 text-[#1F2329]">{r.authorName}</td>
                      <td className="px-2 text-[#646A73]">{r.category}</td>
                      <td className="px-2">
                        <span className={`rounded px-2 py-1 text-xs ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="px-2 font-mono text-xs text-[#646A73]">{r.views}</td>
                      <td className="px-2 font-mono text-xs text-[#646A73]">
                        {(r.createdAt || '').slice(0, 16).replace('T', ' ')}
                      </td>
                      <td className="px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => act(r, 'approve')}
                            disabled={busy}
                            className="flex items-center gap-1 rounded-lg border border-[#00A870] px-2.5 py-1 text-xs text-[#00A870] transition-colors hover:bg-[#00A870] hover:text-white disabled:opacity-60"
                          >
                            <Check className="h-3.5 w-3.5" /> 通过
                          </button>
                          <button
                            onClick={() => act(r, 'reject')}
                            disabled={busy}
                            className="flex items-center gap-1 rounded-lg border border-[#F54A45] px-2.5 py-1 text-xs text-[#F54A45] transition-colors hover:bg-[#F54A45] hover:text-white disabled:opacity-60"
                          >
                            <X className="h-3.5 w-3.5" /> 驳回
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 分页 */}
        <div className="flex items-center justify-between border-t border-[#E5E6EB] px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-[#646A73]">
            共 {total} 条
            <select value={pageSize} onChange={(e) => go({ size: Number(e.target.value), page: 1 })} className="ml-1 h-7 rounded-md border border-[#E5E6EB] bg-white px-2 text-xs text-[#1F2329] outline-none">
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n} 条/页</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <button disabled={page <= 1} onClick={() => go({ page: page - 1 })} className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E5E6EB] text-[#646A73] transition-colors hover:bg-[#F8FAFC] disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-1 text-sm text-[#1F2329]">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => go({ page: page + 1 })} className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E5E6EB] text-[#646A73] transition-colors hover:bg-[#F8FAFC] disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
