import {
  requireActivityRead,
  listActivities,
  listAllActivities,
  activityListQuerySchema,
  toActivityListQuery,
  type ActivityItem,
} from '@/modules/activity';
import { ActivityStats } from '@/components/features/activity/activity-stats';
import { ActivityClient } from '@/components/features/activity/activity-client';

export interface ActivityPageParams {
  kind?: string;
  q?: string;
  page?: string;
}

export const dynamic = 'force-dynamic';

// 活动上架编辑（RSC：统计卡服务端计算 + 数据库分页筛选，零客户端 fetch；写操作走 Server Actions）
// ActivityClient 的 current 保持原始 searchParams 形状（字段兼容，不改动）。
const EMPTY_RESULT = { rows: [] as ActivityItem[], total: 0, page: 1, pageSize: 10, totalPages: 1 };

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<ActivityPageParams>;
}) {
  const params = await searchParams;
  await requireActivityRead();

  const items = await listAllActivities();

  const parsed = activityListQuerySchema.safeParse(params);
  if (!parsed.success) {
    return (
      <div className="space-y-4">
        <ActivityStats items={items} />
        <ActivityClient
          rows={EMPTY_RESULT.rows}
          total={EMPTY_RESULT.total}
          page={EMPTY_RESULT.page}
          totalPages={EMPTY_RESULT.totalPages}
          current={params}
        />
      </div>
    );
  }

  const { rows, total, page, totalPages } = await listActivities(toActivityListQuery(parsed.data));

  return (
    <div className="space-y-4">
      <ActivityStats items={items} />
      <ActivityClient rows={rows} total={total} page={page} totalPages={totalPages} current={params} />
    </div>
  );
}