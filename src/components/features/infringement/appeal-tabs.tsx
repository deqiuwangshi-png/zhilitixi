import Link from 'next/link';

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'needs_review', label: '待复核' },
  { key: 'resolved', label: '已恢复' },
  { key: 'dismissed', label: '已驳回' },
] as const;

export type AppealTab = (typeof tabs)[number]['key'];

/** 申诉案件状态 tab（URL 参数驱动；resolved/dismissed 无存储源，展示空态） */
export function AppealTabs({ current }: { current: AppealTab }) {
  return (
    <div className="flex rounded-md bg-[#F7F8FA] p-1">
      {tabs.map((t) => {
        const active = current === t.key;
        return (
          <Link
            key={t.key}
            href={t.key === 'all' ? '/infringement' : `/infringement?tab=${t.key}`}
            className={`rounded px-3 py-1 text-[13px] transition-colors ${
              active ? 'bg-white text-[#1F2329] shadow-sm' : 'text-[#646A73] hover:text-[#1F2329]'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
