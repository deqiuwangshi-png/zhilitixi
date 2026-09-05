import { requireOverviewRead, getOverviewData, toOverviewRange } from '@/modules/overview';
import { StatCards } from '@/components/features/overview/stat-cards';
import { TrendPanel } from '@/components/features/overview/trend-panel';
import { PenaltyDist } from '@/components/features/overview/penalty-dist';
import { TopReports } from '@/components/features/overview/top-reports';
import { RiskUsers } from '@/components/features/overview/risk-users';

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
