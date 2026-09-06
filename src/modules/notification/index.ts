// 消息通知模块：对外唯一出口（显式导出，禁止 export *）。
// 导出范围：布局层需要的读函数、DTO 类型。
// 不导出：mapper（内部实现）、写函数（只经 actions.ts 调用）、policy（仅内部 commands 使用）。
export type { NotificationItem } from './notification.types';
export { listNotifications } from './notification.queries';
