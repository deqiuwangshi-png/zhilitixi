// 举报处理仓储层：处理写操作 + 兼容导出。
// TODO(阶段六): listReports 已迁移至 src/modules/report/report.queries.ts（数据库分页，
// 不再固定 500 条 select('*') 全量拉取）。本文件保留 applyReportAction 与 ReportItem 类型
// （report 前端组件从 @/lib/repos/report-repo 引用）兼容，勿删仍被引用的导出。
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import type { ReportItem, ReportStatus } from '@/modules/report';

// 类型单一来源 = modules/report（与旧定义同形，结构兼容）。
export type { ReportItem, ReportStatus };

/** 处理举报：写回 reports.status（approve→approved / reject→rejected） */
export async function applyReportAction(id: string, action: 'approve' | 'reject'): Promise<void> {
  const status = action === 'approve' ? 'approved' : 'rejected';
  const { error } = await getSupabasePrivilegedClient().from('reports').update({ status }).eq('id', id);
  if (error) throw new Error(`applyReportAction failed: ${error.message}`);
}
