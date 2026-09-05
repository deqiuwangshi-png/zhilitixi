// 治理总览仓储层：仅保留 DTO 类型导出。
// TODO(阶段六): getOverviewData 已迁移至 src/modules/overview/overview.queries.ts（聚合/
// 映射逻辑下沉 overview.mapper 纯函数，计数下推 DB count:'exact'，不再全量拉取
// select('*').limit(5000) 后内存过滤）。以下类型导出供旧前端组件（从 @/lib/repos/
// overview-repo 引用各 DTO 类型）兼容，勿删仍被引用的导出。

export interface StatCard {
  label: string;
  value: number;
  delta?: number;
  icon: string;
}
export interface TrendPoint {
  label: string;
  value: number;
}
export interface TopReport {
  id: string;
  no: string;
  reason: string;
  target_type: string | null;
  reporter_name: string;
  time: string;
}
export interface PenaltyDistItem {
  type: string;
  count: number;
}
export interface RiskUser {
  name: string;
  level: string;
  desc: string;
}
export interface OverviewData {
  stats: StatCard[];
  trend7: TrendPoint[];
  trend30: TrendPoint[];
  topReports: TopReport[];
  penaltyDist: PenaltyDistItem[];
  highRiskUsers: RiskUser[];
  meta: {
    totalUsers: number;
    pendingVerifications: number;
    highRiskUrls: number;
    todayNew: number;
    todayChange: number;
  };
}
