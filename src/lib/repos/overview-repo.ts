// 治理总览仓储层：首页全部统计的真实查询（类型化，替代旧 /api/overview 的散落逻辑）。
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { fetchUserNames } from '@/lib/dao';
import type { ReportsRow, UrlAuditRow } from '@/lib/db-types';

const DAY = 86400000;
const fmtLabel = (d: Date) =>
  `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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

export async function getOverviewData(): Promise<OverviewData> {
  const client = getSupabaseClient();

  // === 举报数据 ===
  const { data: reports } = await client.from('reports').select('*').limit(5000);
  const rows: ReportsRow[] = reports ?? [];
  const now = new Date();
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday0 = today0 - DAY;

  const pendingReports = rows.filter((r) => r.status === 'pending').length;
  const todayNew = rows.filter((r) => new Date(r.created_at ?? 0).getTime() >= today0).length;
  const yesterdayNew = rows.filter((r) => {
    const t = new Date(r.created_at ?? 0).getTime();
    return t >= yesterday0 && t < today0;
  }).length;
  const todayChange =
    yesterdayNew === 0 ? (todayNew > 0 ? 100 : 0) : Math.round(((todayNew - yesterdayNew) / yesterdayNew) * 100);

  // 待处理申诉：pending 中侵权/违规推广类
  const pendingAppeals = rows.filter(
    (r) =>
      r.status === 'pending' && (r.reason === '侵权' || r.reason === '违规推广' || r.reason === '重复')
  ).length;

  // === 趋势（近7天 / 近30天）===
  const trend7: TrendPoint[] = [];
  const trend30: TrendPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today0 - i * DAY);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const c = rows.filter((r) => {
      const t = new Date(r.created_at ?? 0).getTime();
      return t >= start && t < start + DAY;
    }).length;
    trend7.push({ label: fmtLabel(d), value: c });
  }
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today0 - i * DAY);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const c = rows.filter((r) => {
      const t = new Date(r.created_at ?? 0).getTime();
      return t >= start && t < start + DAY;
    }).length;
    trend30.push({ label: fmtLabel(d), value: c });
  }

  // === 待处理举报 TOP10 ===
  const pendingRaw = rows
    .filter((r) => r.status === 'pending')
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    .slice(0, 10);
  const reporterNames = await fetchUserNames(pendingRaw.map((r) => r.reporter_id ?? ''));
  const pending: TopReport[] = pendingRaw.map((r, idx) => {
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
  });

  // === 处罚分布（真实处罚流水 governance_penalties.action 聚合，可审计）===
  const ACTION_LABEL: Record<string, string> = {
    ban: '封禁',
    limit: '限流',
    unban: '解封',
    unlimit: '解除限流',
    role_change: '角色调整',
    edit: '编辑',
  };
  const { data: penalties } = await client.from('governance_penalties').select('action').limit(1000);
  const dist = new Map<string, number>();
  for (const p of penalties ?? []) {
    const label = ACTION_LABEL[p.action] || p.action || '其他';
    dist.set(label, (dist.get(label) ?? 0) + 1);
  }
  const penaltyDist: PenaltyDistItem[] = Array.from(dist.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // === 违规内容 / 被处罚用户（真实库查询，无凑数） ===
  const { data: urlAudits } = await client.from('url_audit').select('*');
  const urlRows: UrlAuditRow[] = urlAudits ?? [];
  const highRiskUrls = urlRows.filter((u) => u.risk === 'high').length;
  const allRiskUrls = urlRows.filter((u) => u.risk && u.risk !== 'normal' && u.risk !== 'unknown');

  // 被处罚用户 / 高风险用户：基于 users 治理列真实统计（迁移缺失时降级为空）
  let govUsers: { name: string | null; anomaly: string | null; penalty_count: number | null; gov_status: string | null }[] = [];
  try {
    const { data: gu, error: guErr } = await client
      .from('users')
      .select('id,name,anomaly,penalty_count,gov_status')
      .limit(500);
    if (guErr) throw guErr;
    govUsers = (gu ?? []) as typeof govUsers;
  } catch {
    govUsers = [];
  }
  const violated = govUsers.filter(
    (u) => (u.anomaly ?? '') !== '' || (u.penalty_count ?? 0) > 0 || (u.gov_status ?? 'normal') !== 'normal'
  );
  const penalizedUsers = Math.min(violated.length, 99);
  const violationContent = pendingReports + allRiskUrls.length;

  // 高风险用户：累计处罚≥3 次或已封禁（真实数据，无兜底凑数）
  const highRiskUsers: RiskUser[] = violated
    .filter((u) => (u.penalty_count ?? 0) >= 3 || u.gov_status === 'banned')
    .slice(0, 3)
    .map((u) => ({
      name: u.name ?? '用户',
      level: u.gov_status === 'banned' ? '严重风险' : '高风险',
      desc: `累计处罚 ${u.penalty_count ?? 0} 次`,
    }));

  // === 用户数 ===
  const { count: totalUsers } = await client.from('users').select('*', { count: 'exact', head: true });
  const { count: pendingVerifications } = await client
    .from('verifications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const stats: StatCard[] = [
    { label: '待处理举报', value: pendingReports, icon: 'report' },
    { label: '今日新增举报', value: todayNew, delta: todayChange, icon: 'plus' },
    { label: '违规内容', value: violationContent, icon: 'alert' },
    { label: '被处罚用户', value: penalizedUsers, icon: 'user-x' },
    { label: '待处理申诉', value: pendingAppeals, icon: 'rotate' },
    { label: '高风险用户', value: highRiskUsers.length, icon: 'shield' },
  ];

  return {
    stats,
    trend7,
    trend30,
    topReports: pending,
    penaltyDist,
    highRiskUsers,
    meta: { totalUsers: totalUsers ?? 0, pendingVerifications: pendingVerifications ?? 0, highRiskUrls, todayNew, todayChange },
  };
}
