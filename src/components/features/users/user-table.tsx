'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Search, Eye, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import type { UserListItem } from '@/lib/repos/user-repo';
import { changeUserStatus } from '@/lib/actions/user-actions';

const STATUS_LABEL: Record<string, string> = { normal: '正常', limited: '限流', banned: '封禁' };
const STATUS_COLOR: Record<string, string> = {
  normal: 'bg-[#E8F5F1] text-[#006855]',
  limited: 'bg-[#FFF4E5] text-[#FF8800]',
  banned: 'bg-[#FDEAEA] text-[#F54A45]',
};
const ROLE_LABEL: Record<string, string> = { user: '普通用户', moderator: '版主' };
const PAGE_SIZE_OPTIONS = [10, 20, 50];

interface Props {
  rows: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onView: (u: UserListItem) => void;
  onEdit: (u: UserListItem) => void;
}

export function UserTable({ rows, total, page, pageSize, totalPages, onView, onEdit }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const go = (patch: { page?: number; size?: number }) => {
    const sp = new URLSearchParams(window.location.search);
    if (patch.page !== undefined) sp.set('page', String(patch.page));
    if (patch.size !== undefined) sp.set('size', String(patch.size));
    const qs = sp.toString();
    router.push(qs ? `/user-management?${qs}` : '/user-management');
  };

  // 状态循环切换：normal → limited → banned → normal
  const toggleStatus = async (u: UserListItem) => {
    const next = u.status === 'normal' ? 'limit' : u.status === 'limited' ? 'ban' : 'normal';
    setBusyId(u.id);
    const res = await changeUserStatus({ id: u.id, action: next, reason: '状态操作' });
    setBusyId(null);
    if (!res.ok) {
      alert(res.error || '操作失败');
      return;
    }
    router.refresh();
  };

  return (
    <div className="rounded-lg border border-[#E5E6EB] bg-white">
      <div className="flex items-center gap-2 border-b border-[#E5E6EB] px-4 py-3">
        <Users className="h-4 w-4 text-[#006855]" />
        <span className="text-sm font-medium text-[#1F2329]">用户列表</span>
        <span className="ml-auto text-xs text-[#646A73]">共 {total} 位用户</span>
      </div>

      {rows.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-[#646A73]">
          <Search className="h-8 w-8 text-[#C0C4CC]" />
          <span className="text-sm">暂无数据</span>
        </div>
      ) : (
        <table className="w-full min-w-[960px] text-left">
          <thead>
            <tr className="border-b border-[#E5E6EB] bg-[#F8FAFC] text-xs font-medium text-[#646A73]">
              <th className="h-12 px-4">用户</th>
              <th className="h-12 px-4">状态</th>
              <th className="h-12 px-4">角色</th>
              <th className="h-12 px-4">异常标记</th>
              <th className="h-12 px-4">处罚次数</th>
              <th className="h-12 px-4">注册时间</th>
              <th className="h-12 px-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[#F1F2F4] transition-colors hover:bg-[#F8FAFC]">
                <td className="h-12 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#0B0F19]">
                      {r.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.avatarUrl} alt={r.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-medium text-white">
                          {(r.name || '?')[0]}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[#1F2329]">{r.name}</div>
                      <div className="truncate font-mono text-[11px] text-[#646A73]">{r.id}</div>
                    </div>
                  </div>
                </td>
                <td className="h-12 px-4">
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[r.status] || 'bg-[#E5E6EB] text-[#646A73]'}`}>
                    {STATUS_LABEL[r.status] || r.status}
                  </span>
                </td>
                <td className="h-12 px-4 text-sm text-[#1F2329]">{ROLE_LABEL[r.role] || r.role}</td>
                <td className="h-12 px-4">
                  {r.anomaly ? (
                    <span className="inline-flex items-center rounded bg-[#FDEAEA] px-2 py-0.5 text-xs text-[#F54A45]">{r.anomaly}</span>
                  ) : (
                    <span className="text-sm text-[#C0C4CC]">—</span>
                  )}
                </td>
                <td className="h-12 px-4">
                  <span className={`text-sm font-medium ${r.penaltyCount > 0 ? 'text-[#F54A45]' : 'text-[#1F2329]'}`}>{r.penaltyCount}</span>
                </td>
                <td className="h-12 px-4 font-mono text-xs text-[#646A73]">
                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString('zh-CN') : '—'}
                </td>
                <td className="h-12 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => onView(r)} className="flex items-center gap-1 rounded-md border border-[#006855]/30 px-2.5 py-1 text-xs text-[#006855] transition-colors hover:bg-[#E8F5F1]">
                      <Eye className="h-3.5 w-3.5" />查看详情
                    </button>
                    <button onClick={() => onEdit(r)} className="flex items-center gap-1 rounded-md border border-[#E5E6EB] px-2.5 py-1 text-xs text-[#646A73] transition-colors hover:bg-[#F8FAFC] hover:text-[#1F2329]">
                      <Pencil className="h-3.5 w-3.5" />编辑
                    </button>
                    <button onClick={() => toggleStatus(r)} disabled={busyId === r.id} className="rounded-md border border-[#E5E6EB] px-2.5 py-1 text-xs text-[#646A73] transition-colors hover:bg-[#F8FAFC] hover:text-[#1F2329] disabled:opacity-50">
                      {busyId === r.id ? '处理中…' : '状态操作'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
  );
}
