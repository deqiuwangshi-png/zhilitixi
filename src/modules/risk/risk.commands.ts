// 风控中心模块：命令层（写操作）。
// 授权 → zod 校验 → 落库，失败抛稳定 AuthError（不暴露 Supabase 原始错误）。
// 写操作复用旧 risk-repo.applyRiskAction（域名增删/切换、URL 放行封禁删除、上传审核）。
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
import { applyRiskAction as repoApplyRiskAction } from '@/lib/repos/risk-repo';
import { requireRiskManage } from './risk.policy';
import { riskActionSchema, type RiskActionInput } from './risk.schema';

/** 风控操作：risk.manage + 校验 + 复用既有仓库逻辑 */
export async function applyRisk(input: RiskActionInput): Promise<void> {
  await requireRiskManage();
  const parsed = riskActionSchema.safeParse(input);
  if (!parsed.success) {
    throw new AuthError(
      AUTH_ERROR_CODES.VALIDATION_FAILED,
      parsed.error.issues[0]?.message ?? '风控操作输入不合法',
    );
  }
  try {
    await repoApplyRiskAction(parsed.data);
  } catch (err) {
    console.error('[risk] applyRiskAction failed:', err instanceof Error ? err.message : err);
    throw new AuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, '风控操作失败，请稍后重试');
  }
}