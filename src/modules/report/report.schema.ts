// 举报处理模块：输入校验（zod 唯一来源，内联定义；覆盖写操作入参与 URL searchParams 列表校验）。
import { z } from 'zod';
import type { ReportListQuery } from './report.types';

/** 举报处理动作入参（Server Actions 输入边界） */
export const reportActionSchema = z.object({
  id: z.string().min(1, '缺少举报 id'),
  action: z.enum(['approve', 'reject'], '无效的处理动作'),
});

export type ReportActionInput = z.infer<typeof reportActionSchema>;

/** 列表页 pageSize 白名单 */
export const SIZES = [10, 20, 50, 100] as const;
export type ReportSize = (typeof SIZES)[number];

/** 列表筛选默认状态占位（表示"全部"的 URL 值） */
export const STATUS_ALL = 'all';
export const OPTION_ALL = '全部';

/**
 * 举报列表 URL searchParams 校验。
 * 字段均为可选；page 默认 1 且最小 1，size 严格白名单 [10,20,50,100]。
 */
export const reportListQuerySchema = z.object({
  status: z.string().optional(),
  type: z.string().optional(),
  reason: z.string().optional(),
  repeat: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  size: z.coerce
    .number()
    .int()
    .refine((n) => (SIZES as readonly number[]).includes(n), 'pageSize 不在允许范围')
    .optional(),
});

export type ReportListQueryInput = z.infer<typeof reportListQuerySchema>;

/** 把校验后的 URL 参数转换为查询条件（默认 page=1 / pageSize=20，占位值收敛为 undefined） */
export function toReportListQuery(input: ReportListQueryInput): ReportListQuery {
  return {
    page: input.page ?? 1,
    pageSize: input.size ?? 20,
    status: input.status && input.status !== STATUS_ALL ? input.status : undefined,
    type: input.type && input.type !== OPTION_ALL ? input.type : undefined,
    reason: input.reason && input.reason !== OPTION_ALL ? input.reason : undefined,
    repeat: input.repeat === 'repeat' ? true : undefined,
    q: input.q?.trim() || undefined,
  };
}