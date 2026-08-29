// 侵权与申诉输入校验（zod，Server Actions 输入边界）
import { z } from 'zod';

export const appealActionSchema = z.object({
  source: z.enum(['discovery', 'square'], '无效的来源'),
  id: z.string().min(1, '缺少案件 id'),
  action: z.enum(['restore', 'dismiss'], '无效的处理动作'),
});

export type AppealActionInput = z.infer<typeof appealActionSchema>;
