// 治理总览模块：领域类型定义。
// 字段与前端 StatCards / TrendPanel / PenaltyDist / TopReports / RiskUsers 期望完全
// 一致（与旧 overview-repo 的 OverviewData/各子类型同形，保持结构兼容，不改动组件）。

/** 顶部统计卡 */
export interface StatCard {
  label: string;
  value: number;
  delta?: number;
  icon: string;
}

/** 趋势点（举报量按日） */
export interface TrendPoint {
  label: string;
  value: number;
}

/** 待处理举报（TOP10） */
export interface TopReport {
  id: string;
  no: string;
  reason: string;
  target_type: string | null;
  reporter_name: string;
  time: string;
}

/** 处罚分布项 */
export interface PenaltyDistItem {
  type: string;
  count: number;
}

/** 高风险用户 */
export interface RiskUser {
  name: string;
  level: string;
  desc: string;
}

/** 治理总览数据（与旧 overview-repo.OverviewData 完全一致） */
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