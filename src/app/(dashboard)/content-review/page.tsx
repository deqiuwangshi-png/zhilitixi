import {
  requireReviewApply,
  listContent,
  listCategories,
  reviewListQuerySchema,
  toReviewListQuery,
  type ReviewItem,
  type ReviewPageParams,
} from '@/modules/content-review';
import { ReviewFilters } from '@/modules/content-review/components/review-filters';
import { ReviewTable } from '@/modules/content-review/components/review-table';

export const dynamic = 'force-dynamic';

const EMPTY_RESULT = { rows: [] as ReviewItem[], total: 0, page: 1, pageSize: 10, totalPages: 1 };

// 内容审核（RSC：三表合并 + 库内排序 + 合并行内筛选分页，零客户端 fetch；操作走 Server Actions）
// ReviewFilters 的 current 保持原始 searchParams 形状（字段兼容，不改动组件）。
export default async function ContentReviewPage({
  searchParams,
}: {
  searchParams: Promise<ReviewPageParams>;
}) {
  const params = await searchParams;
  await requireReviewApply();

  const categories = await listCategories();

  const parsed = reviewListQuerySchema.safeParse(params);
  if (!parsed.success) {
    return (
      <div className="space-y-4">
        <ReviewFilters current={params} categories={categories} />
        <ReviewTable
          rows={EMPTY_RESULT.rows}
          total={EMPTY_RESULT.total}
          page={EMPTY_RESULT.page}
          pageSize={EMPTY_RESULT.pageSize}
          totalPages={EMPTY_RESULT.totalPages}
        />
      </div>
    );
  }

  const result = await listContent(toReviewListQuery(parsed.data));

  return (
    <div className="space-y-4">
      <ReviewFilters current={params} categories={categories} />
      <ReviewTable
        rows={result.rows}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        totalPages={result.totalPages}
      />
    </div>
  );
}