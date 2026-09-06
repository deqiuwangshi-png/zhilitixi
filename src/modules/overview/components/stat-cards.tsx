import type { StatCard } from '@/modules/overview';

const iconMap: Record<string, React.ReactNode> = {
  report: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  ),
  plus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  alert: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v4M12 17.5h.01" />
    </svg>
  ),
  'user-x': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" />
      <circle cx="8" cy="8" r="4" />
      <path d="m17 10 4 4M21 10l-4 4" />
    </svg>
  ),
  rotate: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  ),
  shield: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2 3 6v6c0 5 3.8 8.6 9 10 5.2-1.4 9-5 9-10V6l-9-4Z" />
    </svg>
  ),
};

const cardTone: Record<string, string> = {
  report: 'text-[#F54A45]',
  plus: 'text-[#006855]',
  alert: 'text-[#FF8800]',
  'user-x': 'text-[#D92D20]',
  rotate: 'text-[#3370FF]',
  shield: 'text-[#006855]',
};

/** 顶部统计卡片行 */
export function StatCards({ stats }: { stats: StatCard[] }) {
  return (
    <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
      {stats.map((c) => {
        const Icon = iconMap[c.icon] || iconMap.shield;
        const tone = cardTone[c.icon] || 'text-[#006855]';
        return (
          <div key={c.label} className="rounded-lg border border-[#E5E6EB] bg-white p-5">
            <div className={`flex items-center gap-1.5 text-[13px] text-[#646A73]`}>
              <span className={tone}>{Icon}</span>
              {c.label}
            </div>
            <div className="mt-3 text-[28px] font-bold leading-none text-[#1F2329]">
              {typeof c.value === 'number' ? c.value : 0}
            </div>
            {typeof c.delta === 'number' && (
              <div className={`mt-2 flex items-center gap-1 text-xs ${c.delta <= 0 ? 'text-[#00A870]' : 'text-[#F54A45]'}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {c.delta <= 0 ? (
                    <path d="M12 5v14M5 12l7 7 7-7" transform="rotate(0 12 12)" />
                  ) : (
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  )}
                </svg>
                {c.delta > 0 ? '+' : ''}
                {c.delta}% 较昨日
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
