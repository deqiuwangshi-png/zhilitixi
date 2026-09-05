// 举报处理仓储层：举报列表组装（编号/联表/重复统计）+ 处理写操作。
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { ReportsRow } from '@/lib/db-types';

export type ReportStatus = 'pending' | 'approved' | 'rejected';

export interface ReportItem {
  id: string;
  reportNo: string;
  status: ReportStatus;
  contentType: string;
  reason: string;
  reporterName: string;
  targetName: string;
  targetId: string | null;
  repeatCount: number;
  createdAt: string | null;
}

const contentTypeMap: Record<string, string> = {
  comment: '评论',
  review: '评论',
  square: '帖子',
  post: '帖子',
  discovery: '帖子',
  user: '用户',
};

const reasonMap: Record<string, string> = {
  垃圾广告: '垃圾广告',
  垃圾内容: '垃圾广告',
  spam: '垃圾广告',
  色情内容: '色情内容',
  pornography: '色情内容',
  冒充他人: '冒充他人',
  impersonation: '冒充他人',
  政治敏感: '政治敏感',
  政治: '政治敏感',
  人身攻击: '人身攻击',
  harassment: '人身攻击',
  违规推广: '违规推广',
  侵权: '侵权',
  重复: '重复',
  违法信息: '违法信息',
};

function normStatus(s?: string | null): ReportStatus {
  const t = (s || 'pending').toLowerCase();
  if (t === 'approved' || t === 'resolved' || t === 'normal') return 'approved';
  if (t === 'rejected' || t === 'ignored' || t === 'blocked') return 'rejected';
  return 'pending';
}

function pad(n: number, size = 3): string {
  return String(n).padStart(size, '0');
}

function humanTarget(r: ReportsRow): string {
  if (!r.target_id) return '未知';
  return String(r.target_id).length > 20 ? String(r.target_id).slice(0, 16) + '…' : String(r.target_id);
}

// TODO(阶段六): listReports 已迁移至 src/modules/report/report.queries.ts（数据库分页，不再固定 500 条）。
// 本文件保留以兼容 report 前端组件仍从 @/lib/repos/report-repo 引用的 ReportItem 类型，勿删仍被引用的导出。
export async function listReports(): Promise<ReportItem[]> {
  const client = getSupabaseClient();
  const { data: reports } = await client
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  const list: ReportsRow[] = reports ?? [];

  // 联表用户名（举报人 + 被举报用户）
  const userIds = new Set<string>();
  for (const r of list) {
    if (r.reporter_id) userIds.add(r.reporter_id);
    if (r.target_type === 'user' && r.target_id) userIds.add(r.target_id);
  }
  const userNames: Record<string, string> = {};
  if (userIds.size) {
    const { data: us } = await client.from('users').select('id,name').in('id', Array.from(userIds));
    for (const x of us ?? []) userNames[x.id] = x.name ?? '';
  }

  // 重复举报次数统计（同一被举报目标）
  const repeatMap: Record<string, number> = {};
  for (const r of list) {
    if (r.target_id) repeatMap[r.target_id] = (repeatMap[r.target_id] ?? 0) + 1;
  }

  return list.map((r, i) => {
    const date = (r.created_at ?? '').slice(0, 10).replace(/-/g, '');
    const rawType = r.target_type ?? '';
    const rawReason = r.reason ?? '';
    const tid = r.target_id ?? '';
    return {
      id: r.id,
      reportNo: `RPT-${date || '00000000'}-${pad(i + 1)}`,
      status: normStatus(r.status),
      contentType: contentTypeMap[rawType] || rawType || '评论',
      reason: reasonMap[rawReason] || rawReason || '垃圾广告',
      reporterName: userNames[r.reporter_id ?? ''] || '未知',
      targetName:
        r.target_type === 'user'
          ? userNames[tid] || (tid ? String(tid).slice(0, 16) : '未知')
          : humanTarget(r),
      targetId: r.target_id,
      repeatCount: repeatMap[tid] || 1,
      createdAt: r.created_at,
    };
  });
}

/** 处理举报：写回 reports.status（approve→approved / reject→rejected） */
export async function applyReportAction(id: string, action: 'approve' | 'reject'): Promise<void> {
  const status = action === 'approve' ? 'approved' : 'rejected';
  const { error } = await getSupabaseClient().from('reports').update({ status }).eq('id', id);
  if (error) throw new Error(`applyReportAction failed: ${error.message}`);
}
