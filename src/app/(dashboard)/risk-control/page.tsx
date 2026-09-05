import { requireRiskRead, listRiskData, type RiskListQuery } from '@/modules/risk';
import { RiskStats } from '@/components/features/risk-control/risk-stats';
import { RiskTabs, type RiskTab } from '@/components/features/risk-control/risk-tabs';
import { RiskClient } from '@/components/features/risk-control/risk-client';

export interface RiskPageParams {
  tab?: string;
  q?: string;
  page?: string;
}

const validTabs: RiskTab[] = ['url', 'domain', 'upload'];

export const dynamic = 'force-dynamic';

// 风控中心（RSC：统计卡服务端计算 + tab/搜索/分页 URL 化，domain tab 为 DB 分页，零客户端 fetch）
export default async function RiskControlPage({
  searchParams,
}: {
  searchParams: Promise<RiskPageParams>;
}) {
  const params = await searchParams;
  await requireRiskRead();

  const query: RiskListQuery = {
    tab: params.tab,
    q: params.q?.trim() || undefined,
    page: Math.max(1, Number(params.page) || 1),
    pageSize: 20,
  };
  const data = await listRiskData(query);
  const tab: RiskTab = (params.tab as RiskTab) && validTabs.includes(params.tab as RiskTab) ? (params.tab as RiskTab) : 'domain';

  return (
    <div className="space-y-4">
      <RiskStats data={data} />
      <div className="rounded-lg border border-[#E5E6EB] bg-white">
        <div className="flex items-center justify-between border-b border-[#F0F1F3] px-4 py-3">
          <div className="text-[15px] font-semibold text-[#1F2329]">风险监控</div>
          <RiskTabs current={tab} />
        </div>
        <RiskClient
          tab={tab}
          urlAudits={data.urlAudits}
          domains={data.pageDomains}
          uploadAudits={data.uploadAudits}
          userNames={data.userNames}
          q={params.q ?? ''}
          page={data.page}
          totalPages={data.totalPages}
        />
      </div>
    </div>
  );
}
