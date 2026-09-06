import type { ActivityStatsData } from '../activity.types';

/** 顶部 3 项统计卡（服务端计算，数据库全量 count） */
export function ActivityStats({ data }: { data: ActivityStatsData }) {
  const { total, active } = data;

  return (
    <div className="grid grid-cols-3 gap-4">
      <Stat label="活动/公告总数" value={total} tone="text-[#1F2329]" />
      <Stat label="上架中" value={active} tone="text-[#006855]" />
      <Stat label="已下线" value={total - active} tone="text-[#646A73]" />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border border-[#E5E6EB] bg-white p-5">
      <p className="text-[13px] text-[#646A73]">{label}</p>
      <p className={`mt-2 text-[28px] font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}
