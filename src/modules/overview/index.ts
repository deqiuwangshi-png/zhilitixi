// 治理总览模块：公共入口（显式导出白名单）。
// 总览为纯只读统计页，无写命令（不设 commands / actions）；
// 页面只从模块面取类型 / 读函数 / 策略，mapper 纯函数不对外导出。
export type {
  StatCard,
  TrendPoint,
  TopReport,
  PenaltyDistItem,
  RiskUser,
  OverviewData,
} from './overview.types';

export {
  overviewRangeSchema,
  toOverviewRange,
  type OverviewRangeInput,
} from './overview.schema';

export { requireOverviewRead } from './overview.policy';
export { getOverviewData } from './overview.queries';
