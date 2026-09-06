import {
  requireReportRead,
  listReports,
  reportListQuerySchema,
  toReportListQuery,
  type ReportItem,
  type ReportPageParams,
} from '@/modules/report';
import { ReportClient } from '@/modules/report/components/report-client';

export const dynamic = 'force-dynamic';

// 举报处理（RSC：数据库分页筛选，零客户端 fetch；处理走 Server Actions）
// ReportClient 的 current 保持原始 searchParams 形状（字段兼容，不改动）。
const EMPTY_RESULT = { rows: [] as ReportItem[], total: 0, page: 1, pageSize: 20, totalPages: 1 };

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<ReportPageParams>;
}) {
  const params = await searchParams;
  await requireReportRead();

  const parsed = reportListQuerySchema.safeParse(params);
  if (!parsed.success) {
    return (
      <ReportClient
        rows={EMPTY_RESULT.rows}
        total={EMPTY_RESULT.total}
        page={EMPTY_RESULT.page}
        pageSize={EMPTY_RESULT.pageSize}
        totalPages={EMPTY_RESULT.totalPages}
        current={params}
      />
    );
  }

  const query = toReportListQuery(parsed.data);
  const { rows, total, page, pageSize, totalPages } = await listReports(query);

  return (
    <ReportClient
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      totalPages={totalPages}
      current={params}
    />
  );
}