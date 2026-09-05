// 规则与处罚模块：输入校验（zod）。
// 复用既有写操作 schema（rule.schema.ts），并预留列表分页常量（当前为无分页全量展示）。

// 复用既有写操作 schema（保持单一来源，避免重复定义）。
export {
  ruleActionSchema,
  type RuleActionInput,
} from '@/lib/validations/rule.schema';

/** 列表页 pageSize 白名单（预留） */
export const SIZES = [10, 20, 50, 100] as const;
export type RuleSize = (typeof SIZES)[number];

/** 分页默认 pageSize（预留） */
export const DEFAULT_PAGE_SIZE = 10;

/** 列表筛选中"全部"的 URL 占位值（预留） */
export const KIND_ALL = 'all';