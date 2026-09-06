// 活动上架模块：输入校验（zod，Server Actions 输入边界）。
// 本文件是校验规则的唯一定义处，不再从 lib/validations re-export。
import { z } from 'zod';
import type { ActivityListQuery } from './activity.types';

export const activitySaveSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(['activity', 'notice', 'banner'], '无效的类型').default('activity'),
  title: z.string().trim().min(1, '标题为必填项').max(100, '标题过长'),
  description: z.string().max(300).optional().default(''),
  sort: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const activityToggleSchema = z.object({
  id: z.string().min(1, '缺少活动 id'),
  active: z.boolean(),
});

export const activityDeleteSchema = z.object({
  id: z.string().min(1, '缺少活动 id'),
});

export type ActivitySaveInput = z.infer<typeof activitySaveSchema>;

/** 列表页 pageSize 白名单 */
export const SIZES = [10, 20, 50, 100] as const;
export type ActivitySize = (typeof SIZES)[number];

/** 分页默认 pageSize */
export const DEFAULT_PAGE_SIZE = 10;

/** 列表筛选中"全部"的 URL/前端占位值 */
export const KIND_ALL = 'all';

/**
 * 活动列表 URL searchParams 校验。
 * 字段均为可选；page 默认 1 且最小 1，size 严格白名单 [10,20,50,100]。
 */
export const activityListQuerySchema = z.object({
  kind: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  size: z.coerce
    .number()
    .int()
    .refine((n) => (SIZES as readonly number[]).includes(n), 'pageSize 不在允许范围')
    .optional(),
});

export type ActivityListQueryInput = z.infer<typeof activityListQuerySchema>;

/** 把校验后的 URL 参数转换为查询条件（默认 page=1 / pageSize=10，占位值收敛为 undefined） */
export function toActivityListQuery(input: ActivityListQueryInput): ActivityListQuery {
  return {
    page: input.page ?? 1,
    pageSize: input.size ?? DEFAULT_PAGE_SIZE,
    kind: input.kind && input.kind !== KIND_ALL ? input.kind : undefined,
    q: input.q?.trim() || undefined,
  };
}
