// 内容审核模块：输入校验（zod 唯一来源，内联定义；覆盖写操作入参与 URL searchParams 列表校验）。
import { z } from 'zod';
import type { ReviewListQuery } from './content-review.types';

/** 审核动作入参（Server Actions 输入边界：来源 + id + 动作 + 驳回理由） */
export const reviewActionSchema = z.object({
  source: z.enum(['discovery', 'square', 'url'], '无效的内容来源'),
  id: z.string().min(1, '缺少内容 id'),
  action: z.enum(['approve', 'reject'], '无效的审核动作'),
  reason: z.string().max(200).optional().default(''),
});

export type ReviewActionInput = z.infer<typeof reviewActionSchema>;

/** 列表页 pageSize 白名单 */
export const SIZES = [10, 20, 50, 100] as const;
export type ReviewSize = (typeof SIZES)[number];

/** 分页默认 pageSize */
export const DEFAULT_PAGE_SIZE = 10;

/** 列表筛选中"全部"的 URL/前端占位值 */
export const STATUS_ALL = 'all';
export const TYPE_ALL = 'all';
export const CATEGORY_ALL = 'all';

/**
 * 内容审核列表 URL searchParams 校验。
 * 字段均为可选；page 默认 1 且最小 1，size 严格白名单 [10,20,50,100]。
 */
export const reviewListQuerySchema = z.object({
  status: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  size: z.coerce
    .number()
    .int()
    .refine((n) => (SIZES as readonly number[]).includes(n), 'pageSize 不在允许范围')
    .optional(),
});

export type ReviewListQueryInput = z.infer<typeof reviewListQuerySchema>;

/** 把校验后的 URL 参数转换为查询条件（默认 page=1 / pageSize=10，占位值收敛为 undefined） */
export function toReviewListQuery(input: ReviewListQueryInput): ReviewListQuery {
  return {
    page: input.page ?? 1,
    pageSize: input.size ?? DEFAULT_PAGE_SIZE,
    status: input.status && input.status !== STATUS_ALL ? input.status : undefined,
    type: input.type && input.type !== TYPE_ALL ? input.type : undefined,
    category: input.category && input.category !== CATEGORY_ALL ? input.category : undefined,
    q: input.q?.trim() || undefined,
  };
}