// 用户管理输入校验（zod，Server Actions 输入边界）
import { z } from 'zod';

export const govActionSchema = z.object({
  id: z.string().min(1, '缺少用户 id'),
  action: z.enum(['ban', 'unban', 'limit', 'unlimit', 'normal'], '无效的治理动作'),
  reason: z.string().max(200).optional().default(''),
});

export const editUserSchema = z.object({
  id: z.string().min(1, '缺少用户 id'),
  name: z.string().trim().min(1, '昵称不能为空').max(30, '昵称过长').optional(),
  points: z.number().int('积分为整数').min(-100000).max(100000).optional(),
  badge: z.string().max(30, '徽章过长').optional(),
  role: z.enum(['user', 'moderator']).optional(),
});

export type GovActionInput = z.infer<typeof govActionSchema>;
export type EditUserInput = z.infer<typeof editUserSchema>;
