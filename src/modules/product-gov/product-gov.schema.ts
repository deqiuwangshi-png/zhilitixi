// 商品治理模块：输入校验（zod）。
// 复用既有写操作 schema（product.schema.ts），并新增 URL searchParams 列表校验 schema。
import { z } from 'zod';
import type { ProductListQuery } from './product-gov.types';

// 复用既有写操作 schema（保持单一来源，避免重复定义）。
export {
  productEditSchema,
  productDeleteSchema,
  type ProductEditInput,
  type ProductDeleteInput,
} from '@/lib/validations/product.schema';

/** 列表页 pageSize 白名单 */
export const SIZES = [10, 20, 50, 100] as const;
export type ProductSize = (typeof SIZES)[number];

/** 分页默认 pageSize */
export const DEFAULT_PAGE_SIZE = 10;

/** 列表筛选中"全部"的 URL 占位值 */
export const TYPE_ALL = 'all';
export const STATUS_ALL = 'all';

/**
 * 商品列表 URL searchParams 校验。
 * 字段均为可选；page 默认 1 且最小 1，size 严格白名单 [10,20,50,100]。
 */
export const productListQuerySchema = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  size: z.coerce
    .number()
    .int()
    .refine((n) => (SIZES as readonly number[]).includes(n), 'pageSize 不在允许范围')
    .optional(),
});

export type ProductListQueryInput = z.infer<typeof productListQuerySchema>;

/** 把校验后的 URL 参数转换为查询条件（默认 page=1 / pageSize=10，占位值收敛为 undefined） */
export function toProductListQuery(input: ProductListQueryInput): ProductListQuery {
  return {
    page: input.page ?? 1,
    pageSize: input.size ?? DEFAULT_PAGE_SIZE,
    type: input.type && input.type !== TYPE_ALL ? input.type : undefined,
    status: input.status && input.status !== STATUS_ALL ? input.status : undefined,
    q: input.q?.trim() || undefined,
  };
}