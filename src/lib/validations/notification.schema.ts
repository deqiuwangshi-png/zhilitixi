// 消息通知输入校验（zod，Server Actions 输入边界）
import { z } from 'zod';

export const notificationReadSchema = z.object({
  id: z.string().min(1, '缺少通知 id'),
});

export type NotificationReadInput = z.infer<typeof notificationReadSchema>;
