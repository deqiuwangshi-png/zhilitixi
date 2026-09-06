// 消息通知模块：输入校验（zod，Server Actions 输入边界）。
// 本文件是校验规则的唯一定义处，不再从 lib/validations re-export。
import { z } from 'zod';

/** 单条通知标记已读：必须携带通知 id */
export const notificationReadSchema = z.object({
  id: z.string().min(1, '缺少通知 id'),
});

export type NotificationReadInput = z.infer<typeof notificationReadSchema>;
