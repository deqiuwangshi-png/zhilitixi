// 治理总览模块：行归一化 / 聚合映射（纯函数，从旧 overview-repo 迁移）。
// 负责把裸查询行收敛为 DTO（趋势点 / TOP 举报 / 处罚分布 / 高风险用户 / 统计卡），
// 数据库编排见 overview.queries。
import type {
  GovernancePenaltiesRow,
  ReportsRow,
} from '@/lib/db-types';
import type { PenaltyDistItem, RiskUser, StatCard, TopReport, TrendPoint } from './overview.types';

export const DAY = 86400000;

/** 日期标签：MM-DD */
export function fmtLabel(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 近 N 天举报趋势（today 对齐到当日 0 点） */
export function buildTrend(rows: ReportsRow[], days: number, today0: number): TrendPoint[] {
  const out: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today0 - i * DAY);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const c = rows.filter((r) => {
      const t = new Date(r.created_at ?? 0).getTime();
      return t >= start && t < start + DAY;
    }).length;
    out.push({ label: fmtLabel(d), value: c });
  }
  return out;
}

/** 当日统计（pending 举报 / 今日新增 / 环比增量 / 待处理申诉） */
export function computeTodayStats(
  rows: ReportsRow[],
  today0: number,
  now: number,
): { pendingReports: number; todayNew: number; todayChange: number; pendingAppeals: number } {
  const yesterday0 = today0 - DAY;
  const pendingReports = rows.filter((r) => r.status === 'pending').length;
  const todayNew = rows.filter((r) => new Date(r.created_at ?? 0).getTime() >= today0).length;
  const yesterdayNew = rows.filter((r) => {
    const t = new Date(r.created_at ?? 0).getTime();
    return t >= yesterday0 && t < today0;
  }).length;
  const todayChange =
    yesterdayNew === 0 ? (todayNew > 0 ? 100 : 0) : Math.round(((todayNew - yesterdayNew) / yesterdayNew) * 100);

  const pendingAppeals = rows.filter(
    (r) =>
      r.status === 'pending' && (r.reason === '侵权' || r.reason === '违规推广' || r.reason === '重复'),
  ).length;

  return { pendingReports, todayNew, todayChange, pendingAppeals };
}

/** 单条待处理举报 → TopReport DTO */
export function rowToTopReport(
  r: ReportsRow,
  idx: number,
  reporterNames: Record<string, string>,
  now: Date,
): TopReport {
  const d = new Date(r.created_at ?? Date.now());
  const num = String((r.target_id ?? '').slice(-3) || idx + 1).padStart(3, '0');
  return {
    id: r.id,
    no: `RPT-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${num}`,
    reason: r.reason || '其他',
    target_type: r.target_type,
    reporter_name: reporterNames[r.reporter_id ?? ''] || '匿名',
    time: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  };
}

/** 处罚动作 → 中文标签 */
function labelPenalty(action: string | null): string {
  const labels: Record<string, string> = {
    ban: '封禁',
    limit: '限流',
    unban: '解封',
    unlimit: '解除限流',
    role_change: '角色调整',
    edit: '编辑',
  };
  return labels[action ?? ''] || action || '其他';
}

/** 处罚流水 → 按 action 聚合的分布（按数量倒序） */
export function buildPenaltyDist(penaltyRows: { action: string | null }[]): PenaltyDistItem[] {
  const dist = new Map<string, number>();
  for (const p of penaltyRows) {
    const label = labelPenalty(p.action);
    dist.set(label, (dist.get(label) ?? 0) + 1);
  }
  return Array.from(dist.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

/** 用户治理列裸行（高风险用户统计所需字段） */
export interface GovUserRow {
  name: string | null;
  anomaly: string | null;
  penalty_count: number | null;
  gov_status: string | null;
}

/** 违规用户判定：anomaly 非空 / 有处罚 / 非 normal */
export function selectViolatedUsers(rows: GovUserRow[]): GovUserRow[] {
  return rows.filter(
    (u) => (u.anomaly ?? '') !== '' || (u.penalty_count ?? 0) > 0 || (u.gov_status ?? 'normal') !== 'normal',
  );
}

/** 高风险用户：累计处罚≥3 或已封禁（top3 有界） */
export function buildRiskUsers(rows: GovUserRow[]): RiskUser[] {
  return rows
    .filter((u) => (u.penalty_count ?? 0) >= 3 || u.gov_status === 'banned')
    .slice(0, 3)
    .map((u) => ({
      name: u.name ?? '用户',
      level: u.gov_status === 'banned' ? '严重风险' : '高风险',
      desc: `累计处罚 ${u.penalty_count ?? 0} 次`,
    }));
}

/** 顶部统计卡组装 */
export function buildStatCards(args: {
  pendingReports: number;
  todayNew: number;
  todayChange: number;
  violationContent: number;
  penalizedUsers: number;
  pendingAppeals: number;
  highRiskUserCount: number;
}): StatCard[] {
  return [
    { label: '待处理举报', value: args.pendingReports, icon: 'report' },
    { label: '今日新增举报', value: args.todayNew, delta: args.todayChange, icon: 'plus' },
    { label: '违规内容', value: args.violationContent, icon: 'alert' },
    { label: '被处罚用户', value: args.penalizedUsers, icon: 'user-x' },
    { label: '待处理申诉', value: args.pendingAppeals, icon: 'rotate' },
    { label: '高风险用户', value: args.highRiskUserCount, icon: 'shield' },
  ];
}