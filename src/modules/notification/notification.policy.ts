// 消息通知模块：资源授权策略。
// 通知为「当前后台管理员本人的站内通知」，无细分权限点——读写均要求已登录管理员。
// 薄封装 requireAdmin（返回 admin，userId 供本人数据过滤），错误语义与统一权限层一致。
import { requireAdmin } from '@/lib/auth';
import type { CurrentAdmin } from '@/lib/auth';

/** 读取 / 标记本人通知：要求已登录管理员（返回 admin 供 user_id 过滤） */
export function requireNotificationAccess(): Promise<CurrentAdmin> {
  return requireAdmin();
}
