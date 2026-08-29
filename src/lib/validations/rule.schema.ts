// 规则与处罚输入校验（zod，Server Actions 输入边界）
import { z } from 'zod';

export const ruleActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('addDomain'),
    domain: z.string().trim().min(1, '域名必填').max(253),
    kind: z.enum(['trusted', 'blocked'], '无效的类型'),
    note: z.string().max(200).optional().default(''),
  }),
  z.object({
    action: z.literal('toggleDomain'),
    domain: z.string().trim().min(1, '域名必填').max(253),
  }),
  z.object({
    action: z.literal('deleteDomain'),
    domain: z.string().trim().min(1, '域名必填').max(253),
  }),
]);

export type RuleActionInput = z.infer<typeof ruleActionSchema>;
