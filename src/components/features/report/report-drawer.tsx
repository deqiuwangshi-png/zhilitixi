'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReportItem } from '@/lib/repos/report-repo';
import { handleReport } from '@/lib/actions/report-actions';

const statusMeta: Record<string, { label: string; cls: string }> = {
  pending: { label: '待处理', cls: 'bg-[#FFF4E6] text-[#FF8800]' },
  approved: { label: '已通过', cls: 'bg-[#E6F7F0] text-[#00A870]' },
  rejected: { label: '已驳回', cls: 'bg-[#FDEBEA] text-[#F54A45]' },
};

interface Props {
  report: ReportItem;
  onClose: () => void;
}

/** 举报详情抽屉：数据来自 RSC props，处理走 Server Action，成功自动关闭 */
export function ReportDrawer({ report, onClose }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const act = async (action: 'approve' | 'reject') => {
    setBusy(true);
    const res = await handleReport({ id: report.id, action });
    setBusy(false);
    if (!res.ok) {
      alert(res.error || '操作失败');
      return;
    }
    router.refresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
      <div className="flex h-full w-[480px] flex-col border-l border-[#E5E6EB] bg-white shadow-none" style={{ animation: 'slideIn 250ms ease-out' }}>
        <style>{`@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
        <div className="flex items-center justify-between border-b border-[#E5E6EB] px-6 py-4">
          <h3 className="text-base font-semibold text-[#1F2329]">举报详情</h3>
          <button onClick={onClose} className="text-xl leading-none text-[#646A73] transition-colors hover:text-[#1F2329]" aria-label="关闭">
            ×
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6 text-sm">
          <Field label="举报编号" value={report.reportNo} mono />
          <Field label="内容类型" value={report.contentType} />
          <Field label="举报原因" value={report.reason} />
          <Field label="举报人" value={report.reporterName} />
          <Field label="被举报人" value={report.targetName} />
          <Field label="目标 ID" value={report.targetId ?? '—'} mono />
          <Field label="重复举报" value={`${report.repeatCount} 次`} />
          <Field label="举报时间" value={(report.createdAt || '').slice(0, 16).replace('T', ' ')} mono />
          <Field label="当前状态" value={statusMeta[report.status]?.label ?? report.status} />
        </div>

        <div className="border-t border-[#E5E6EB] px-6 py-4">
          <div className="text-xs text-[#646A73]">处理该举报后状态将写回主库 reports.status</div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => act('reject')}
              disabled={busy}
              className="rounded-lg border border-[#F54A45] px-4 py-2 text-sm text-[#F54A45] transition-colors hover:bg-[#F54A45] hover:text-white disabled:opacity-60"
            >
              驳回
            </button>
            <button
              onClick={() => act('approve')}
              disabled={busy}
              className="rounded-lg bg-[#006855] px-4 py-2 text-sm text-white transition-colors hover:bg-[#005643] disabled:opacity-60"
            >
              {busy ? '处理中…' : '通过'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs text-[#9AA0A6]">{label}</div>
      <div className={mono ? 'font-mono text-[13px] text-[#1F2329]' : 'text-[13px] text-[#1F2329]'}>
        {value}
      </div>
    </div>
  );
}
