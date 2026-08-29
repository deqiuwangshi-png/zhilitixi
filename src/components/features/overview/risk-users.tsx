import type { RiskUser } from '@/lib/repos/overview-repo';

/** 高风险用户列表（真实治理数据） */
export function RiskUsers({ items }: { items: RiskUser[] }) {
  return (
    <div className="rounded-lg border border-[#E5E6EB] bg-white p-5 lg:col-span-2">
      <h3 className="mb-1 text-[15px] font-semibold text-[#1F2329]">高风险用户</h3>
      <p className="mb-3 text-xs text-[#A0A6B0]">风险等级与累计处罚次数</p>
      {items.length ? (
        <ul className="space-y-3">
          {items.map((u, i) => (
            <li key={i} className="flex items-center gap-3 rounded-lg border border-[#F1F2F5] p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8F5F1] text-[#006855]">
                {u.name?.charAt(0) ?? '用'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[#1F2329]">{u.name}</div>
                <div className="truncate text-xs text-[#A0A6B0]">{u.desc}</div>
              </div>
              <span
                className={`shrink-0 rounded px-2 py-0.5 text-xs ${
                  u.level === '严重风险' ? 'bg-[#FDECEC] text-[#D92D20]' : 'bg-[#FFEBEC] text-[#F54A45]'
                }`}
              >
                {u.level}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex h-40 items-center justify-center text-sm text-[#A0A6B0]">暂无高风险用户</div>
      )}
    </div>
  );
}
