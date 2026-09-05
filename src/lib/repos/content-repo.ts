// 内容审核仓储层：仅保留兼容导出（DTO 类型）。
// TODO(模块化迁移)：内容审核已迁移至 src/modules/content-review，列表与写操作（listContent /
// reviewItem / batchReviewItems）均已改从模块导入；旧 listContent / applyReview 已不再被业务
// 入口调用，已删除。本文件导出仍被 components/features/review/review-table.tsx
// （ContentItem 类型）引用，故保留类型导出，勿删仍被引用的导出。
import type { ReviewItem, ReviewSource, ReviewStatus } from '@/modules/content-review';

// 类型单一来源 = modules/content-review（与旧定义同形，结构兼容）。
export type ContentSource = ReviewSource;
export type ContentItem = ReviewItem;
export type { ReviewStatus };
