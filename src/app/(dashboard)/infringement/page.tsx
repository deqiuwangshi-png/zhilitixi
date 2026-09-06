import { requireAppealRead, listAppeals } from '@/modules/appeal';
import { AppealHeader } from '@/modules/appeal/components/appeal-header';
import { AppealTabs, type AppealTab } from '@/modules/appeal/components/appeal-tabs';
import { AppealClient } from '@/modules/appeal/components/appeal-client';

export const dynamic = 'force-dynamic';

const validTabs: AppealTab[] = ['all', 'needs_review', 'resolved', 'dismissed'];

// 侵权与申诉（RSC：DB union 视图全量队列服务端查询，处理走 Server Actions）
export default async function InfringementPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  await requireAppealRead();

  const appeals = await listAppeals({ page: 1, pageSize: 20 });
  const tab: AppealTab = (params.tab as AppealTab) && validTabs.includes(params.tab as AppealTab) ? (params.tab as AppealTab) : 'all';

  // 目前无 resolved/dismissed 存储源：非 all/needs_review 时展示空态（诚实反映现状）
  const visible = tab === 'all' || tab === 'needs_review' ? appeals.rows : [];

  return (
    <div className="space-y-4">
      <AppealHeader items={appeals.rows} />
      <div className="rounded-lg border border-[#E5E6EB] bg-white">
        <div className="flex items-center justify-between border-b border-[#F0F1F3] px-5 py-3">
          <div className="text-[15px] font-semibold text-[#1F2329]">申诉案件</div>
          <AppealTabs current={tab} />
        </div>
        <AppealClient appeals={visible} />
      </div>
    </div>
  );
}
