import { requireOverviewRead, getOverviewData, toOverviewRange } from '@/modules/overview';
import { StatCards } from '@/modules/overview/components/stat-cards';
import { TrendPanel } from '@/modules/overview/components/trend-panel';
import { PenaltyDist } from '@/modules/overview/components/penalty-dist';
import { TopReports } from '@/modules/overview/components/top-reports';
import { RiskUsers } from '@/modules/overview/components/risk-users';

export const dynamic = 'force-dynamic';

// 治理总览首页（RSC：服务端直查模块 queries，零客户端 fetch；纯只读 overview.read）
export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  await requireOverviewRead();

  const data = await getOverviewData();
  const range = toOverviewRange({ range: params.range });
  const trend = range === '7' ? data.trend7 : data.trend30;

  return (
    <div className="space-y-4">
      {/* 1. 统计卡片行 */}
      <StatCards stats={data.stats} />

      {/* 2. 中部：举报趋势 + 处罚分布 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <TrendPanel range={range} data={trend} />
        <PenaltyDist data={data.penaltyDist} />
      </div>

      {/* 3. 底部：待处理举报TOP10 + 高风险用户 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <TopReports items={data.topReports} />
        <RiskUsers items={data.highRiskUsers} />
      </div>
    </div>
  );
}
