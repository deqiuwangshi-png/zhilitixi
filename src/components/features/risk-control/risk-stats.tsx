import type { RiskData } from '@/lib/repos/risk-repo';

/** 顶部 4 项统计卡（服务端计算） */
export function RiskStats({ data }: { data: RiskData }) {
  const high = data.urlAudits.filter((u) => u.risk === 'high').length;
  const blocked = data.domains.filter((d) => d.kind === 'blocked').length;

  return (
    <div className="grid grid-cols-4 gap-4">
      <Stat label="URL 巡检" value={data.urlAudits.length} tone="text-[#1F2329]" />
      <Stat label="高风险链接" value={high} tone="text-[#D92D20]" />
      <Stat label="黑名单域名" value={blocked} tone="text-[#FF8800]" />
      <Stat label="上传审核" value={data.uploadAudits.length} tone="text-[#1F2329]" />
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
