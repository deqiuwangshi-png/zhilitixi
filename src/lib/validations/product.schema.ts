// 商品治理输入校验（zod，Server Actions 输入边界）
import { z } from 'zod';

export const productEditSchema = z.object({
  source: z.enum(['discovery', 'square'], '无效的来源'),
  id: z.string().min(1, '缺少商品 id'),
  title: z.string().trim().min(1, '标题为必填项').max(100, '标题过长'),
  kind: z.string().max(50).optional().default(''),
  commission: z.union([z.string(), z.number(), z.null()]).optional(),
  promoType: z.string().max(50).optional().default(''),
  url: z.string().max(500).optional().default(''),
  commercial: z.boolean().optional(),
  status: z.enum(['上架', '下架'], '无效的状态'),
});

export const productDeleteSchema = z.object({
  source: z.enum(['discovery', 'square'], '无效的来源'),
  id: z.string().min(1, '缺少商品 id'),
});

export type ProductEditInput = z.infer<typeof productEditSchema>;
export type ProductDeleteInput = z.infer<typeof productDeleteSchema>;
