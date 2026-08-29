'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, ShieldBan, Gauge, History } from 'lucide-react';
import type { UserListItem, PenaltyRecord } from '@/lib/repos/user-repo';
import { changeUserStatus } from '@/lib/actions/user-actions';

const STATUS_LABEL: Record<string, string> = { normal: '正常', limited: '限流', banned: '封禁' };
const ROLE_LABEL: Record<string, string> = { user: '普通用户', moderator: '版主' };
const STATUS_COLOR: Record<string, string> = {
  normal: 'bg-[#E8F5F1] text-[#006855]',
  limited: 'bg-[#FFF4E5] text-[#FF8800]',
  banned: 'bg-[#FDEAEA] text-[#F54A45]',
};

interface Props {
  user: UserListItem;
  history: PenaltyRecord[];
  onClose: () => void;
}

/** 用户详情抽屉：数据全部来自 RSC props（零 fetch），治理操作走 Server Action */
export function UserDetailDrawer({ user, history, onClose }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (action: 'ban' | 'limit') => {
    setBusy(action);
    const res = await changeUserStatus({
      id: user.id,
      action,
      reason: action === 'ban' ? '手动封禁' : '手动限流',
    });
    setBusy(null);
    if (!res.ok) {
      alert(res.error || '操作失败');
      return;
    }
    router.refresh();
  };

  const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('zh-CN') : '—');

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 transition-opacity" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 h-full w-[480px] translate-x-0 bg-white shadow-none ring-1 ring-[#E5E6EB]">
        {/* 头部 */}
        <div className="border-b border-[#E5E6EB] px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1F2329]">用户详情</h2>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-[#646A73] transition-colors hover:bg-[#F8FAFC]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#0B0F19]">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-medium text-white">{(user.name || '?')[0]}</div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-base font-semibold text-[#1F2329]">{user.name}</span>
                <span className="rounded bg-[#E8F5F1] px-2 py-0.5 text-xs font-medium text-[#006855]">{ROLE_LABEL[user.role] || user.role}</span>
              </div>
              <div className="mt-0.5 truncate font-mono text-xs text-[#646A73]">ID · {user.id}</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[#646A73]">
            <span>注册时间　<span className="font-mono text-[#1F2329]">{fmt(user.createdAt)}</span></span>
            <span>积分　<span className="font-mono text-[#1F2329]">{user.points}</span></span>
          </div>
        </div>

        {/* 内容 */}
        <div className="max-h-[calc(100%-210px)] overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="当前状态">
              <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[user.status] || 'bg-[#E5E6EB] text-[#646A73]'}`}>{STATUS_LABEL[user.status] || user.status}</span>
            </Field>
            <Field label="封禁至"><span className="font-mono text-sm text-[#1F2329]">{fmt(user.banUntil)}</span></Field>
            <Field label="限流至"><span className="font-mono text-sm text-[#1F2329]">{fmt(user.rateLimitUntil)}</span></Field>
            <Field label="累计处罚"><span className={`text-sm font-semibold ${user.penaltyCount > 0 ? 'text-[#F54A45]' : 'text-[#1F2329]'}`}>{user.penaltyCount} 次</span></Field>
          </div>

          {user.anomaly && (
            <div className="mt-4 rounded-md bg-[#FDEAEA] px-3 py-2 text-xs text-[#F54A45]">异常标记：{user.anomaly}</div>
          )}

          <div className="mt-5">
            <div className="flex items-center gap-2 text-sm font-medium text-[#1F2329]">
              <History className="h-4 w-4 text-[#006855]" />历史处罚记录
            </div>
            {history.length > 0 ? (
              <div className="mt-2 space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="rounded-lg border border-[#E5E6EB] p-3">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${h.action === 'ban' ? 'bg-[#FDEAEA] text-[#F54A45]' : 'bg-[#FFF4E5] text-[#FF8800]'}`}>
                        {h.action === 'ban' ? '封禁' : h.action === 'limit' ? '限流' : h.action === 'role_change' ? '角色调整' : '编辑'}
                      </span>
                      <span className="font-mono text-[11px] text-[#646A73]">{fmt(h.at)}</span>
                    </div>
                    <div className="mt-1.5 text-xs text-[#1F2329]">{h.reason}</div>
                    <div className="mt-0.5 text-[11px] text-[#646A73]">操作人：{h.operator}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2 flex h-20 items-center justify-center rounded-lg border border-dashed border-[#E5E6EB] text-xs text-[#646A73]">暂无处罚记录</div>
            )}
          </div>
        </div>

        {/* 底部操作 */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 border-t border-[#E5E6EB] px-6 py-4">
          <button onClick={() => act('ban')} disabled={busy === 'ban'} className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#F54A45] py-2 text-sm font-medium text-white transition-colors hover:bg-[#D92D20] disabled:opacity-60">
            <ShieldBan className="h-4 w-4" />{busy === 'ban' ? '处理中…' : '封禁用户'}
          </button>
          <button onClick={() => act('limit')} disabled={busy === 'limit'} className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#FF8800] py-2 text-sm font-medium text-white transition-colors hover:bg-[#E67A00] disabled:opacity-60">
            <Gauge className="h-4 w-4" />{busy === 'limit' ? '处理中…' : '限流用户'}
          </button>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#E5E6EB] p-3">
      <div className="text-[11px] text-[#646A73]">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
