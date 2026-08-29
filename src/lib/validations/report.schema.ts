// 举报处理输入校验（zod，Server Actions 输入边界）
import { z } from 'zod';

export const reportActionSchema = z.object({
  id: z.string().min(1, '缺少举报 id'),
  action: z.enum(['approve', 'reject'], '无效的处理动作'),
});

export type ReportActionInput = z.infer<typeof reportActionSchema>;
