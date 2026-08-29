// 用户认证审核输入校验（zod，Server Actions 输入边界）
import { z } from 'zod';

export const verificationActionSchema = z.object({
  id: z.string().min(1, '缺少申请 id'),
  action: z.enum(['approve', 'reject'], '无效的审核动作'),
});

export type VerificationActionInput = z.infer<typeof verificationActionSchema>;
