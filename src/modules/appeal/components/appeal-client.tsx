'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Undo2, ShieldCheck, Eye, X } from 'lucide-react';
import type { AppealItem } from '../appeal.types';
import { handleAppeal } from '../actions';

/** 申诉案件列表 + 详情抽屉（数据来自 RSC props，处理走 Server Action，source 取真实来源） */
export function AppealClient({ appeals }: { appeals: AppealItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<AppealItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const act = async (a: AppealItem, action: 'restore' | 'dismiss') => {
    setBusyId(`${a.source}-${a.id}`);
    const res = await handleAppeal({ source: a.source, id: a.id, action });
    setBusyId(null);
    if (!res.ok) {
      alert(res.error || '操作失败');
      return;
    }
    if (selected?.id === a.id) setSelected(null);
    router.refresh();
  };

  return (
    <>
      <div className="rounded-lg border border-[#E5E6EB] bg-white">
        {appeals.length === 0 ? (
          <p className="p-6 text-sm text-[#646A73]">暂无申诉数据</p>
        ) : (
          <div className="divide-y divide-[#F0F1F3]">
            {appeals.map((a) => (
              <div key={`${a.source}-${a.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[#F8FAFC]">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium text-[#1F2329]">{a.title}</span>
                    <span className="rounded bg-[#FDEBEA] px-1.5 py-0.5 text-[11px] text-[#F54A45]">
                      标记原因：{a.reason || '违规'}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-[#646A73]">
                    <span>作者：{a.authorName}</span>
                    {a.url && <span className="font-mono text-[#006855]">{a.url}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => setSelected(a)}
                    className="flex items-center gap-1 rounded-md border border-[#E5E6EB] px-2.5 py-1.5 text-[12px] text-[#646A73] transition-colors hover:bg-[#F7F8FA]"
                  >
                    <Eye className="h-3.5 w-3.5" /> 查看详情
                  </button>
                  <button
                    onClick={() => act(a, 'restore')}
                    disabled={busyId === `${a.source}-${a.id}`}
                    className="flex items-center gap-1 rounded-md border border-[#E5E6EB] px-2.5 py-1.5 text-[12px] text-[#00A870] transition-colors hover:bg-[#E6F7F0] disabled:opacity-40"
                  >
                    <Undo2 className="h-3.5 w-3.5" /> 恢复发布
                  </button>
                  <button
                    onClick={() => act(a, 'dismiss')}
                    disabled={busyId === `${a.source}-${a.id}`}
                    className="flex items-center gap-1 rounded-md border border-[#E5E6EB] px-2.5 py-1.5 text-[12px] text-[#F54A45] transition-colors hover:bg-[#FDEBEA] disabled:opacity-40"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> 维持处罚
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 详情抽屉 */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative flex h-full w-[480px] flex-col bg-white shadow-none" style={{ animation: 'drawer-in .25s ease-out' }}>
            <div className="flex h-14 items-center justify-between border-b border-[#E5E6EB] px-5">
              <span className="text-[15px] font-semibold text-[#1F2329]">申诉详情</span>
              <button onClick={() => setSelected(null)} className="rounded-md p-1 text-[#646A73] transition-colors hover:bg-[#F7F8FA]" aria-label="关闭">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div>
                <div className="mb-1 text-[12px] text-[#646A73]">内容标题</div>
                <div className="text-[14px] font-medium text-[#1F2329]">{selected.title}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1 text-[12px] text-[#646A73]">作者</div>
                  <div className="text-[14px] text-[#1F2329]">{selected.authorName}</div>
                </div>
                <div>
                  <div className="mb-1 text-[12px] text-[#646A73]">标记原因</div>
                  <div className="text-[14px] text-[#F54A45]">{selected.reason || '违规'}</div>
                </div>
              </div>
              {selected.url && (
                <div>
                  <div className="mb-1 text-[12px] text-[#646A73]">关联链接</div>
                  <div className="break-all font-mono text-[13px] text-[#006855]">{selected.url}</div>
                </div>
              )}
              <div>
                <div className="mb-1 text-[12px] text-[#646A73]">内容描述 / 申请说明</div>
                <div className="rounded-md bg-[#F7F8FA] p-3 text-[13px] text-[#1F2329]">
                  {selected.content || selected.note || selected.description || '（无补充说明）'}
                </div>
              </div>
            </div>
            <div className="flex gap-2 border-t border-[#E5E6EB] p-4">
              <button
                onClick={() => act(selected, 'restore')}
                disabled={busyId === `${selected.source}-${selected.id}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#006855] px-3 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#005646] disabled:opacity-50"
              >
                <Undo2 className="h-4 w-4" /> 恢复发布
              </button>
              <button
                onClick={() => act(selected, 'dismiss')}
                disabled={busyId === `${selected.source}-${selected.id}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[#F54A45] px-3 py-2.5 text-[13px] font-medium text-[#F54A45] transition-colors hover:bg-[#FDEBEA] disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" /> 维持处罚
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
