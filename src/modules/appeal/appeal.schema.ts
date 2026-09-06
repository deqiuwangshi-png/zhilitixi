// 侵权与申诉模块：输入校验（zod，域内唯一定义处）。
import { z } from 'zod';
import type { AppealListQuery } from './appeal.types';

/** 申诉处理输入（写操作边界）：restore 恢复发布 / dismiss 维持处罚 */
export const appealActionSchema = z.object({
  source: z.enum(['discovery', 'square'], '无效的来源'),
  id: z.string().min(1, '缺少案件 id'),
  action: z.enum(['restore', 'dismiss'], '无效的处理动作'),
});

export type AppealActionInput = z.infer<typeof appealActionSchema>;

/** 列表页 pageSize 白名单 */
export const SIZES = [10, 20, 50, 100] as const;
export type AppealSize = (typeof SIZES)[number];

/** 分页默认 pageSize（当前为全量队列展示，白名单能力预留） */
export const DEFAULT_PAGE_SIZE = 10;

/** 列表筛选中"全部"的 URL 占位值 */
export const TAB_ALL = 'all';

/**
 * 申诉列表 URL searchParams 校验。
 * tab 可选；page 默认 1 且最小 1，size 严格白名单 [10,20,50,100]。
 */
export const appealListQuerySchema = z.object({
  tab: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  size: z.coerce
    .number()
    .int()
    .refine((n) => (SIZES as readonly number[]).includes(n), 'pageSize 不在允许范围')
    .optional(),
});

export type AppealListQueryInput = z.infer<typeof appealListQuerySchema>;

/** 把校验后的 URL 参数转换为查询条件（默认 page=1 / pageSize=10，占位值收敛为 undefined） */
export function toAppealListQuery(input: AppealListQueryInput): AppealListQuery {
  return {
    page: input.page ?? 1,
    pageSize: input.size ?? DEFAULT_PAGE_SIZE,
    tab: input.tab && input.tab !== TAB_ALL ? input.tab : undefined,
  };
}
