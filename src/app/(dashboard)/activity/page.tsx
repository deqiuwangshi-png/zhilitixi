import { requireAdmin } from '@/lib/auth';
import { listActivities } from '@/lib/repos/activity-repo';
import { ActivityStats } from '@/components/features/activity/activity-stats';
import { ActivityClient } from '@/components/features/activity/activity-client';

export interface ActivityPageParams {
  kind?: string;
  q?: string;
  page?: string;
}

const PAGE_SIZE = 10;

export const dynamic = 'force-dynamic';

// 活动上架编辑（RSC：统计卡服务端计算 + 筛选/分页，零客户端 fetch）
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<ActivityPageParams>;
}) {
  const params = await searchParams;
  await requireAdmin();

  const items = await listActivities();

  // 服务端筛选
  let filtered = items;
  if (params.kind && params.kind !== 'all') filtered = filtered.filter((a) => a.kind === params.kind);
  if (params.q?.trim()) {
    const q = params.q.trim().toLowerCase();
    filtered = filtered.filter(
      (a) => `${a.title ?? ''}${a.description ?? ''}`.toLowerCase().includes(q)
    );
  }

  // 服务端分页
  const page = Math.max(1, Number(params.page) || 1);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <ActivityStats items={items} />
      <ActivityClient rows={pageRows} total={total} page={safePage} totalPages={totalPages} current={params} />
    </div>
  );
}
