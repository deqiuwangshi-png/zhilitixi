// 举报处理模块：公共入口（显式导出白名单，页面/组件只从模块面取类型与读函数；
// 写操作经 actions.ts 唯一入口，commands 落库函数与 mapper 不对外导出）。
export type {
  ReportStatus,
  ReportAction,
  ReportItem,
  ReportPageParams,
  ReportListQuery,
  ReportPageResult,
  ReportNoFn,
  ContentTypeFn,
  ReasonFn,
  StatusFn,
  RowToDtoContext,
  ReportListRow,
} from './report.types';

export {
  reportActionSchema,
  reportListQuerySchema,
  toReportListQuery,
  SIZES,
  STATUS_ALL,
  OPTION_ALL,
  type ReportActionInput,
  type ReportSize,
  type ReportListQueryInput,
} from './report.schema';

export { requireReportRead, requireReportModerate } from './report.policy';
export { listReports } from './report.queries';
