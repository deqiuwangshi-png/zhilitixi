import { requireAdmin } from '@/lib/auth';
import { listProducts } from '@/lib/repos/product-repo';
import { ProductStats } from '@/components/features/product-gov/product-stats';
import { ProductClient } from '@/components/features/product-gov/product-client';

export interface ProductPageParams {
  type?: string;
  status?: string;
  q?: string;
  page?: string;
}

const PAGE_SIZE = 10;

export const dynamic = 'force-dynamic';

// 商品治理（RSC：统计卡服务端计算 + 筛选/分页，零客户端 fetch）
export default async function ProductGovPage({
  searchParams,
}: {
  searchParams: Promise<ProductPageParams>;
}) {
  const params = await searchParams;
  await requireAdmin();

  const { rows, stats } = await listProducts();

  // 服务端筛选
  let filtered = rows;
  if (params.type === 'commercial') filtered = filtered.filter((r) => r.source === 'discovery');
  if (params.type === 'square') filtered = filtered.filter((r) => r.source === 'square');
  if (params.status === 'up') filtered = filtered.filter((r) => r.status === '上架');
  if (params.status === 'down') filtered = filtered.filter((r) => r.status === '下架');
  if (params.q?.trim()) {
    const q = params.q.trim().toLowerCase();
    filtered = filtered.filter(
      (r) => `${r.title} ${r.authorName} ${r.url}`.toLowerCase().includes(q)
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
      <ProductStats stats={stats} />
      <ProductClient rows={pageRows} total={total} page={safePage} totalPages={totalPages} current={params} />
    </div>
  );
}
