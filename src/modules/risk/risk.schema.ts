// 风控中心模块：输入校验（zod，域内唯一定义处）。
import { z } from 'zod';
import type { RiskListQuery } from './risk.types';

/** 风控操作输入（写操作边界）：域名增删/切换、URL 放行封禁删除、上传审核 */
export const riskActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('domain'),
    action: z.enum(['upsert', 'delete'], '无效的动作'),
    domain: z.string().trim().min(1, '域名必填').max(253),
    kind: z.enum(['trusted', 'blocked']).optional(),
    note: z.string().max(200).optional(),
  }),
  z.object({
    type: z.literal('url'),
    action: z.enum(['approve', 'reject', 'delete'], '无效的动作'),
    id: z.union([z.string(), z.number()]),
    risk: z.enum(['safe', 'high']).optional(),
  }),
  z.object({
    type: z.literal('upload'),
    action: z.enum(['approve', 'reject'], '无效的动作'),
    id: z.union([z.string(), z.number()]),
  }),
]);

export type RiskActionInput = z.infer<typeof riskActionSchema>;

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