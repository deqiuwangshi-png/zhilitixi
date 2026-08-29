import { requireAdmin } from '@/lib/auth';
import { listContent } from '@/lib/repos/content-repo';
import { ReviewFilters } from '@/components/features/review/review-filters';
import { ReviewTable } from '@/components/features/review/review-table';

export interface ReviewPageParams {
  status?: string;
  type?: string;
  category?: string;
  q?: string;
  page?: string;
  size?: string;
}

export const dynamic = 'force-dynamic';

// 内容审核（RSC：服务端筛选 + 分页，零客户端 fetch；操作走 Server Actions）
export default async function ContentReviewPage({
  searchParams,
}: {
  searchParams: Promise<ReviewPageParams>;
}) {
  const params = await searchParams;
  await requireAdmin();

  const items = await listContent();

  // 服务端筛选
  let filtered = items;
  if (params.status && params.status !== 'all') filtered = filtered.filter((r) => r.status === params.status);
  if (params.type && params.type !== 'all') filtered = filtered.filter((r) => r.typeKind === params.type);
  if (params.category && params.category !== 'all') filtered = filtered.filter((r) => r.category === params.category);
  if (params.q?.trim()) {
    const q = params.q.trim().toLowerCase();
    filtered = filtered.filter((r) => r.title.toLowerCase().includes(q) || r.authorName.toLowerCase().includes(q));
  }

  const categories = Array.from(new Set(items.map((r) => r.category).filter(Boolean)));

  // 服务端分页
  const pageSize = params.size ? Number(params.size) : 10;
  const page = Math.max(1, Number(params.page) || 1);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-4">
      <ReviewFilters current={params} categories={categories} />
      <ReviewTable rows={pageRows} total={total} page={safePage} pageSize={pageSize} totalPages={totalPages} />
    </div>
  );
}
