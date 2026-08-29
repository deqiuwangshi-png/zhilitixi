import { requireAdmin } from '@/lib/auth';
import { listRiskData } from '@/lib/repos/risk-repo';
import { RiskStats } from '@/components/features/risk-control/risk-stats';
import { RiskTabs, type RiskTab } from '@/components/features/risk-control/risk-tabs';
import { RiskClient } from '@/components/features/risk-control/risk-client';

export interface RiskPageParams {
  tab?: string;
  q?: string;
  page?: string;
}

const PAGE_SIZE = 20;
const validTabs: RiskTab[] = ['url', 'domain', 'upload'];

export const dynamic = 'force-dynamic';

// 风控中心（RSC：统计卡服务端计算 + tab/搜索/分页 URL 化，零客户端 fetch）
export default async function RiskControlPage({
  searchParams,
}: {
  searchParams: Promise<RiskPageParams>;
}) {
  const params = await searchParams;
  await requireAdmin();

  const data = await listRiskData();
  const tab: RiskTab = (params.tab as RiskTab) && validTabs.includes(params.tab as RiskTab) ? (params.tab as RiskTab) : 'domain';

  // domain tab：服务端搜索 + 分页
  let domains = data.domains;
  if (params.q?.trim()) {
    const q = params.q.trim().toLowerCase();
    domains = domains.filter((d) => d.domain.toLowerCase().includes(q) || (d.note ?? '').toLowerCase().includes(q));
  }
  const page = Math.max(1, Number(params.page) || 1);
  const totalPages = Math.max(1, Math.ceil(domains.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedDomains = domains.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
          domains={tab === 'domain' ? pagedDomains : data.domains}
          uploadAudits={data.uploadAudits}
          userNames={data.userNames}
          q={params.q ?? ''}
          page={safePage}
          totalPages={totalPages}
        />
      </div>
    </div>
  );
}
