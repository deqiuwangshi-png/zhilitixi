import { requireAdmin } from '@/lib/auth';
import { listReports } from '@/lib/repos/report-repo';
import { ReportClient } from '@/components/features/report/report-client';

export interface ReportPageParams {
  status?: string;
  type?: string;
  reason?: string;
  repeat?: string;
  q?: string;
  page?: string;
  size?: string;
}

export const dynamic = 'force-dynamic';

// 举报处理（RSC：服务端筛选 + 分页，零客户端 fetch；处理走 Server Actions）
export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<ReportPageParams>;
}) {
  const params = await searchParams;
  await requireAdmin();

  const items = await listReports();

  // 服务端筛选
  let filtered = items;
  if (params.status && params.status !== 'all') filtered = filtered.filter((r) => r.status === params.status);
  if (params.type && params.type !== '全部') filtered = filtered.filter((r) => r.contentType === params.type);
  if (params.reason && params.reason !== '全部') filtered = filtered.filter((r) => r.reason === params.reason);
  if (params.repeat === 'repeat') filtered = filtered.filter((r) => r.repeatCount >= 2);
  if (params.q?.trim()) {
    const q = params.q.trim().toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.reportNo.toLowerCase().includes(q) ||
        r.reporterName.toLowerCase().includes(q) ||
        r.targetName.toLowerCase().includes(q)
    );
  }

  // 服务端分页
  const pageSize = params.size ? Number(params.size) : 20;
  const page = Math.max(1, Number(params.page) || 1);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <ReportClient
      rows={pageRows}
      total={total}
      page={safePage}
      pageSize={pageSize}
      totalPages={totalPages}
      current={params}
    />
  );
}
