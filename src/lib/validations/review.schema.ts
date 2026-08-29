// 内容审核输入校验（zod，Server Actions 输入边界）
import { z } from 'zod';

export const reviewActionSchema = z.object({
  source: z.enum(['discovery', 'square', 'url'], '无效的内容来源'),
  id: z.string().min(1, '缺少内容 id'),
  action: z.enum(['approve', 'reject'], '无效的审核动作'),
  reason: z.string().max(200).optional().default(''),
});

export type ReviewActionInput = z.infer<typeof reviewActionSchema>;
