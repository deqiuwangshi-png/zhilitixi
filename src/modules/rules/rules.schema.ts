// 规则与处罚模块：输入校验（zod，Server Actions 输入边界）。
// 本文件是校验规则的唯一定义处，不再从 lib/validations re-export。
import { z } from 'zod';

export const ruleActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('addDomain'),
    domain: z.string().trim().min(1, '域名必填').max(253),
    kind: z.enum(['trusted', 'blocked'], '无效的类型'),
    note: z.string().max(200).optional().default(''),
  }),
  z.object({
    action: z.literal('toggleDomain'),
    domain: z.string().trim().min(1, '域名必填').max(253),
  }),
  z.object({
    action: z.literal('deleteDomain'),
    domain: z.string().trim().min(1, '域名必填').max(253),
  }),
]);

export type RuleActionInput = z.infer<typeof ruleActionSchema>;

/** 列表页 pageSize 白名单（预留） */
export const SIZES = [10, 20, 50, 100] as const;
export type RuleSize = (typeof SIZES)[number];

/** 分页默认 pageSize（预留） */
export const DEFAULT_PAGE_SIZE = 10;

/** 列表筛选中"全部"的 URL 占位值（预留） */
export const KIND_ALL = 'all';
