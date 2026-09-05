// 举报处理模块：命令层（写操作）。
// 授权 → 写回 reports.status（approve→approved / reject→rejected），失败抛稳定 Error。
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
import { requireReportModerate } from './report.policy';
import type { ReportAction } from './report.types';

/** 处理举报：写回状态 */
export async function applyReportAction(id: string, action: ReportAction): Promise<void> {
  // 授权：approve→report.approve / reject→report.reject
  await requireReportModerate(action);

  const status = action === 'approve' ? 'approved' : 'rejected';
  const { error } = await getSupabasePrivilegedClient().from('reports').update({ status }).eq('id', id);
  if (error) {
    // 稳定文案对外；原始错误只落日志
    console.error('[report] applyReportAction failed:', error.message);
    throw new AuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, '举报处理失败，请稍后重试');
  }
}