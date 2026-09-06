import Link from 'next/link';

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已驳回' },
] as const;

export type AuthTab = (typeof tabs)[number]['key'];

/** 状态 tab 筛选（URL 参数驱动，可分享/回退） */
export function AuthTabs({ current }: { current: AuthTab }) {
  return (
    <div className="flex gap-1 rounded-md bg-[#F7F8FA] p-1">
      {tabs.map((t) => {
        const active = current === t.key;
        return (
          <Link
            key={t.key}
            href={t.key === 'all' ? '/user-auth' : `/user-auth?tab=${t.key}`}
            className={`rounded px-3 py-1 text-[13px] transition-colors ${
              active ? 'bg-white text-[#1F2329]' : 'text-[#646A73] hover:text-[#1F2329]'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
