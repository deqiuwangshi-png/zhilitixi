// 活动上架模块：对外唯一出口（显式导出，禁止 export *）。
// 导出范围：页面需要的读函数、授权入口、列表查询 schema，以及对外 DTO 类型。
// 不导出：mapper（内部实现）、写函数（只经 actions.ts 调用）。
export type { ActivityItem, ActivityStatsData, ActivityPageParams } from './activity.types';
export { listActivities, getActivityStats } from './activity.queries';
export { requireActivityRead } from './activity.policy';
export { activityListQuerySchema, toActivityListQuery } from './activity.schema';
