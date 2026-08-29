import { requireAdmin } from '@/lib/auth';
import { listAppeals } from '@/lib/repos/appeal-repo';
import { AppealHeader } from '@/components/features/infringement/appeal-header';
import { AppealTabs, type AppealTab } from '@/components/features/infringement/appeal-tabs';
import { AppealClient } from '@/components/features/infringement/appeal-client';

export const dynamic = 'force-dynamic';

const validTabs: AppealTab[] = ['all', 'needs_review', 'resolved', 'dismissed'];

// 侵权与申诉（RSC：列表服务端查询，处理走 Server Actions）
export default async function InfringementPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  await requireAdmin();

  const appeals = await listAppeals();
  const tab: AppealTab = (params.tab as AppealTab) && validTabs.includes(params.tab as AppealTab) ? (params.tab as AppealTab) : 'all';

  // 目前无 resolved/dismissed 存储源：非 all/needs_review 时展示空态（诚实反映现状）
  const visible = tab === 'all' || tab === 'needs_review' ? appeals : [];

  return (
    <div className="space-y-4">
      <AppealHeader items={appeals} />
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
