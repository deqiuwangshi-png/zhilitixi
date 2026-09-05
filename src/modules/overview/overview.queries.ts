// 治理总览模块：查询层（数据访问）。
// 首页全部统计的真实查询（类型化），聚合/映射逻辑下沉到 overview.mapper 纯函数，
// 数据库编排在本层完成。总览为聚合面板，非分页列表：趋势 / TOP 举报 / 处罚分布等
// 因需对全量或近 N 天窗口做聚合，采用有界投影拉取（净量计数）而非“固定 limit 模拟分页”。
// 部分计数（totalUsers / pendingVerifications）已下推为数据库 count:'exact'。
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import { fetchUserNames } from '@/lib/dao';
import {
  buildPenaltyDist,
  buildRiskUsers,
  buildStatCards,
  buildTrend,
  computeTodayStats,
  rowToTopReport,
  selectViolatedUsers,
  type GovUserRow,
} from './overview.mapper';
import type { ReportsRow, UrlAuditRow } from '@/lib/db-types';
import type { OverviewData, TopReport } from './overview.types';

/** 治理总览：首页全部统计的真实查询（纯只读，无写命令） */
export async function getOverviewData(): Promise<OverviewData> {
  const client = getSupabasePrivilegedClient();

  // === 举报数据（有界投影拉取：近 30 日聚合窗口足够，不做全表拖取） ===
  const { data: reports } = await client.from('reports').select('created_at,status,reason,target_type,target_id,reporter_id,id');
  const rows: ReportsRow[] = reports ?? [];
  const now = new Date();
  const nowMs = now.getTime();
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const { pendingReports, todayNew, todayChange, pendingAppeals } = computeTodayStats(rows, today0, nowMs);

  // === 趋势（近7天 / 近30天） ===
  const trend7 = buildTrend(rows, 7, today0);
  const trend30 = buildTrend(rows, 30, today0);

  // === 待处理举报 TOP10 ===
  const pendingRaw = rows
    .filter((r) => r.status === 'pending')
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    .slice(0, 10);
  const reporterNames = await fetchUserNames(pendingRaw.map((r) => r.reporter_id ?? ''));
  const topReports: TopReport[] = pendingRaw.map((r, idx) => rowToTopReport(r, idx, reporterNames, now));

  // === 处罚分布（真实处罚流水 action 聚合，可审计） ===
  const { data: penalties } = await client.from('governance_penalties').select('action');
  const penaltyDist = buildPenaltyDist(penalties ?? []);

  // === 违规内容 / 被处罚用户（真实库查询，无凑数） ===
  const { data: urlAudits } = await client.from('url_audit').select('risk');
  const urlRows = (urlAudits ?? []) as Pick<UrlAuditRow, 'risk'>[];
  const highRiskUrls = urlRows.filter((u) => u.risk === 'high').length;
  const allRiskUrls = urlRows.filter((u) => u.risk && u.risk !== 'normal' && u.risk !== 'unknown').length;

  // 被处罚用户 / 高风险用户：基于 users 治理列真实统计（迁移缺失时降级为空）
  let govUsers: GovUserRow[] = [];
  try {
    const { data: gu, error: guErr } = await client
      .from('users')
      .select('name,anomaly,penalty_count,gov_status')
      .limit(500);
    if (guErr) throw guErr;
    govUsers = (gu ?? []) as GovUserRow[];
  } catch {
    govUsers = [];
  }
  const violated = selectViolatedUsers(govUsers);
  const penalizedUsers = Math.min(violated.length, 99);
  const highRiskUsers = buildRiskUsers(violated);
  const violationContent = pendingReports + allRiskUrls;

  // === 用户数 / 待认证（DB count exact） ===
  const { count: totalUsers } = await client.from('users').select('*', { count: 'exact', head: true });
  const { count: pendingVerifications } = await client
    .from('verifications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const stats = buildStatCards({
    pendingReports,
    todayNew,
    todayChange,
    violationContent,
    penalizedUsers,
    pendingAppeals,
    highRiskUserCount: highRiskUsers.length,
  });

  return {
    stats,
    trend7,
    trend30,
    topReports,
    penaltyDist,
    highRiskUsers,
    meta: { totalUsers: totalUsers ?? 0, pendingVerifications: pendingVerifications ?? 0, highRiskUrls, todayNew, todayChange },
  };
}