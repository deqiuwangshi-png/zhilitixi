// 风控中心模块：输入校验（zod）。
// 复用既有写操作 schema（risk.schema.ts），并新增 URL searchParams 列表校验 schema。
import { z } from 'zod';
import type { RiskListQuery } from './risk.types';

// 复用既有写操作 schema（保持单一来源，避免重复定义）。
export {
  riskActionSchema,
  type RiskActionInput,
} from '@/lib/validations/risk.schema';

/** 列表页 pageSize 白名单 */
export const SIZES = [10, 20, 50, 100] as const;
export type RiskSize = (typeof SIZES)[number];

/** 分页默认 pageSize（沿用域名 tab 原 20 条/页） */
export const DEFAULT_PAGE_SIZE = 20;

/** 列表筛选中"全部"的 URL 占位值（风控暂未用） */
export const TAB_ALL = 'all';

/**
 * 风控列表 URL searchParams 校验。
 * tab/q 可选；page 默认 1 且最小 1，size 严格白名单 [10,20,50,100]。
 */
export const riskListQuerySchema = z.object({
  tab: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  size: z.coerce
    .number()
    .int()
    .refine((n) => (SIZES as readonly number[]).includes(n), 'pageSize 不在允许范围')
    .optional(),
});

export type RiskListQueryInput = z.infer<typeof riskListQuerySchema>;

/** 把校验后的 URL 参数转换为查询条件（默认 page=1 / pageSize=20，占位值收敛为 undefined） */
export function toRiskListQuery(input: RiskListQueryInput): RiskListQuery {
  return {
    page: input.page ?? 1,
    pageSize: input.size ?? DEFAULT_PAGE_SIZE,
    tab: input.tab && input.tab !== TAB_ALL ? input.tab : undefined,
    q: input.q?.trim() || undefined,
  };
}