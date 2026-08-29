// 风控中心输入校验（zod，Server Actions 输入边界）
import { z } from 'zod';

export const riskActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('domain'),
    action: z.enum(['upsert', 'delete'], '无效的动作'),
    domain: z.string().trim().min(1, '域名必填').max(253),
    kind: z.enum(['trusted', 'blocked']).optional(),
    note: z.string().max(200).optional(),
  }),
  z.object({
    type: z.literal('url'),
    action: z.enum(['approve', 'reject', 'delete'], '无效的动作'),
    id: z.union([z.string(), z.number()]),
    risk: z.enum(['safe', 'high']).optional(),
  }),
  z.object({
    type: z.literal('upload'),
    action: z.enum(['approve', 'reject'], '无效的动作'),
    id: z.union([z.string(), z.number()]),
  }),
]);

export type RiskActionInput = z.infer<typeof riskActionSchema>;
