'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Eye } from 'lucide-react';
import type { VerificationItem } from '../users.types';
import { handleVerification } from '../actions';

const statusStyle: Record<string, string> = {
  approved: 'bg-[#E6F7F0] text-[#00A870]',
  rejected: 'bg-[#FDEBEA] text-[#F54A45]',
  pending: 'bg-[#FFF4E6] text-[#FF8800]',
};

const statusText: Record<string, string> = {
  approved: '已通过',
  rejected: '已驳回',
  pending: '待审核',
};

/** 认证申请列表 + 详情抽屉（数据来自 RSC props，审核走 Server Action） */
export function AuthClient({ verifications }: { verifications: VerificationItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<VerificationItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const act = async (v: VerificationItem, action: 'approve' | 'reject') => {
    setBusyId(v.id);
    const res = await handleVerification({ id: v.id, action });
    setBusyId(null);
    if (!res.ok) {
      alert(res.error || '操作失败');
      return;
    }
    if (selected?.id === v.id) setSelected(null);
    router.refresh();
  };

  const vtypeText = (v: VerificationItem) => (v.vtype === 'personal' ? '个人认证' : v.vtype || '认证');

  return (
    <>
      {verifications.length === 0 ? (
        <p className="p-6 text-sm text-[#646A73]">暂无认证申请</p>
      ) : (
        <div className="divide-y divide-[#F0F1F3]">
          {verifications.map((v) => (
              <div key={v.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[#F8FAFC]">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-[#1F2329]">{v.userName}</span>
                    <span className="text-xs text-[#646A73]">{vtypeText(v)}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[11px] ${statusStyle[v.status] || 'bg-[#EEF1F4] text-[#646A73]'}`}>
                      {statusText[v.status] || v.status}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[#646A73]">{v.statement}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => setSelected(v)}
                    className="flex items-center gap-1 rounded-md border border-[#E5E6EB] px-2.5 py-1.5 text-[12px] text-[#646A73] transition-colors hover:bg-[#F7F8FA]"
                  >
                    <Eye className="h-3.5 w-3.5" /> 详情
                  </button>
                  <button
                    onClick={() => act(v, 'approve')}
                    disabled={v.status === 'approved' || busyId === v.id}
                    className="flex items-center gap-1 rounded-md border border-[#E5E6EB] px-2.5 py-1.5 text-[12px] text-[#00A870] transition-colors hover:bg-[#E6F7F0] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Check className="h-3.5 w-3.5" /> 通过
                  </button>
                  <button
                    onClick={() => act(v, 'reject')}
                    disabled={v.status === 'rejected' || busyId === v.id}
                    className="flex items-center gap-1 rounded-md border border-[#E5E6EB] px-2.5 py-1.5 text-[12px] text-[#F54A45] transition-colors hover:bg-[#FDEBEA] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X className="h-3.5 w-3.5" /> 驳回
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* 详情抽屉 */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelected(null)} />
          <div className="relative flex h-full w-[480px] max-w-full flex-col bg-white shadow-2xl" style={{ animation: 'drawer-in .25s ease-out' }}>
            <div className="flex items-center justify-between border-b border-[#E5E6EB] px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-[#1F2329]">认证详情</h2>
                <p className="mt-0.5 font-mono text-xs text-[#646A73]">{selected.id}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-md p-1.5 text-[#646A73] transition-colors hover:bg-[#F0F1F3]" aria-label="关闭">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E8F5F1] text-sm font-semibold text-[#006855]">
                  {selected.userName[0] || '用'}
                </div>
                <div>
                  <div className="text-sm font-medium text-[#1F2329]">{selected.userName}</div>
                  <div className="text-xs text-[#646A73]">{vtypeText(selected)}</div>
                </div>
              </div>
              <div className="rounded-lg border border-[#E5E6EB] p-4">
                <div className="text-xs text-[#646A73]">申请说明</div>
                <p className="mt-1.5 text-sm leading-6 text-[#1F2329]">{selected.statement || '（无说明）'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-[#E5E6EB] p-3">
                  <div className="text-xs text-[#646A73]">当前状态</div>
                  <div className="mt-1 font-medium text-[#1F2329]">{statusText[selected.status] || selected.status}</div>
                </div>
                <div className="rounded-lg border border-[#E5E6EB] p-3">
                  <div className="text-xs text-[#646A73]">申请时间</div>
                  <div className="mt-1 font-medium text-[#1F2329]">{(selected.createdAt || '').slice(0, 19).replace('T', ' ')}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-[#E5E6EB] px-6 py-4">
              <button
                onClick={() => act(selected, 'approve')}
                disabled={selected.status === 'approved' || busyId === selected.id}
                className="flex-1 rounded-lg bg-[#006855] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#005a48] disabled:cursor-not-allowed disabled:opacity-40"
              >
                通过
              </button>
              <button
                onClick={() => act(selected, 'reject')}
                disabled={selected.status === 'rejected' || busyId === selected.id}
                className="flex-1 rounded-lg border border-[#F54A45] py-2.5 text-sm font-medium text-[#F54A45] transition-colors hover:bg-[#FDEBEA] disabled:cursor-not-allowed disabled:opacity-40"
              >
                驳回
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
