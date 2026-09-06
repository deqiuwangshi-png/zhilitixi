'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BellOff, CheckCheck, Inbox } from 'lucide-react';
import type { NotificationItem } from '../notification.types';
import { markRead, markAllRead } from '../actions';

const typeLabel: Record<string, string> = {
  penalty: '处罚',
  review: '审核',
  appeal: '申诉',
  system: '系统',
  report: '举报',
};

/** 顶栏通知面板（数据来自 RSC props，已读操作走 Server Action） */
export function NotificationPanel({
  notifications,
  onClose,
}: {
  notifications: NotificationItem[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // 点击面板外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const readOne = async (n: NotificationItem) => {
    if (n.read) return;
    setBusy(true);
    const res = await markRead({ id: n.id });
    setBusy(false);
    if (!res.ok) {
      alert(res.error || '操作失败');
      return;
    }
    router.refresh();
  };

  const readAll = async () => {
    if (unreadCount === 0) return;
    setBusy(true);
    const res = await markAllRead();
    setBusy(false);
    if (!res.ok) {
      alert(res.error || '操作失败');
      return;
    }
    router.refresh();
  };

  const fmt = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full z-50 mt-1 w-[360px] overflow-hidden rounded-lg border border-[#E5E6EB] bg-white"
      style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-[#F0F1F3] px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#1F2329]">
          <Bell className="h-4 w-4 text-[#006855]" />
          消息通知
          {unreadCount > 0 && (
            <span className="rounded-full bg-[#FDEBEA] px-1.5 py-0.5 text-[10px] font-medium text-[#F54A45]">
              {unreadCount} 未读
            </span>
          )}
        </div>
        <button
          onClick={readAll}
          disabled={unreadCount === 0 || busy}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#006855] transition-colors hover:bg-[#E8F5F1] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCheck className="h-3.5 w-3.5" /> 全部已读
        </button>
      </div>

      {/* 列表 */}
      <div className="max-h-[320px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-[#9AA0A6]">
            <Inbox className="h-8 w-8" />
            <span className="text-xs">暂无通知</span>
          </div>
        ) : (
          <div className="divide-y divide-[#F0F1F3]">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => readOne(n)}
                disabled={busy}
                className={`flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-[#F8FAFC] disabled:opacity-50 ${
                  !n.read ? 'bg-[#F4FBF9]' : ''
                }`}
              >
                <span className="mt-1 flex h-2 w-2 shrink-0 items-center justify-center">
                  {!n.read && <span className="h-2 w-2 rounded-full bg-[#F54A45]" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-medium text-[#1F2329]">{n.title || '系统通知'}</span>
                    {n.type && (
                      <span className="shrink-0 rounded bg-[#EEF1F4] px-1 py-0.5 text-[10px] text-[#646A73]">
                        {typeLabel[n.type] || n.type}
                      </span>
                    )}
                  </span>
                  {n.content && (
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-[#646A73]">{n.content}</span>
                  )}
                  <span className="mt-1 block font-mono text-[10px] text-[#9AA0A6]">{fmt(n.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 底部关闭提示 */}
      <div className="flex items-center justify-center border-t border-[#F0F1F3] py-1.5">
        <button onClick={onClose} className="flex items-center gap-1 py-1 text-[11px] text-[#646A73] transition-colors hover:text-[#1F2329]">
          <BellOff className="h-3 w-3" /> 关闭面板（点击面板外也可关闭）
        </button>
      </div>
    </div>
  );
}
