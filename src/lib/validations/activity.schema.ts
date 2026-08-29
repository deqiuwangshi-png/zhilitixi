// 活动上架输入校验（zod，Server Actions 输入边界）
import { z } from 'zod';

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
