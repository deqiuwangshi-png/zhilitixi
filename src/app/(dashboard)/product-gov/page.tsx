import {
  requireProductRead,
  listProducts,
  getProductStats,
  productListQuerySchema,
  toProductListQuery,
  type ProductItem,
  type ProductPageParams,
} from '@/modules/product-gov';
import { ProductStats } from '@/modules/product-gov/components/product-stats';
import { ProductClient } from '@/modules/product-gov/components/product-client';

export const dynamic = 'force-dynamic';

// 商品治理（RSC：统计卡服务端计算 + 数据库分页筛选，零客户端 fetch；写操作走 Server Actions）
// ProductClient 的 current 保持原始 searchParams 形状（字段兼容，不改动）。
const EMPTY_RESULT = { rows: [] as ProductItem[], total: 0, page: 1, pageSize: 10, totalPages: 1 };

export default async function ProductGovPage({
  searchParams,
}: {
  searchParams: Promise<ProductPageParams>;
}) {
  const params = await searchParams;
  await requireProductRead();

  const stats = await getProductStats();

  const parsed = productListQuerySchema.safeParse(params);
  if (!parsed.success) {
    return (
      <div className="space-y-4">
        <ProductStats stats={stats} />
        <ProductClient
          rows={EMPTY_RESULT.rows}
          total={EMPTY_RESULT.total}
          page={EMPTY_RESULT.page}
          totalPages={EMPTY_RESULT.totalPages}
          current={params}
        />
      </div>
    );
  }

  const { rows, total, page, totalPages } = await listProducts(toProductListQuery(parsed.data));

  return (
    <div className="space-y-4">
      <ProductStats stats={stats} />
      <ProductClient rows={rows} total={total} page={page} totalPages={totalPages} current={params} />
    </div>
  );
}