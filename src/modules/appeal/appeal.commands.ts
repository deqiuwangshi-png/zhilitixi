// 侵权与申诉模块：命令层（写操作）。
// 授权 → zod 校验 → 落库，失败抛稳定 AuthError（不暴露 Supabase 原始错误）。
// 写操作复用旧 appeal-repo.applyAppealAction（restore 恢复发布 / dismiss 维持处罚）。
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
import { applyAppealAction as repoApplyAppealAction } from '@/lib/repos/appeal-repo';
import { requireAppealManage } from './appeal.policy';
import { appealActionSchema, type AppealActionInput } from './appeal.schema';

/** 申诉处理（恢复发布 / 维持处罚）：appeal.manage + 校验 + 复用既有仓库逻辑 */
export async function applyAppeal(input: AppealActionInput): Promise<void> {
  await requireAppealManage();
  const parsed = appealActionSchema.safeParse(input);
  if (!parsed.success) {
    throw new AuthError(
      AUTH_ERROR_CODES.VALIDATION_FAILED,
      parsed.error.issues[0]?.message ?? '申诉输入不合法',
    );
  }
  try {
    await repoApplyAppealAction(parsed.data.source, parsed.data.id, parsed.data.action);
  } catch (err) {
    console.error('[appeal] applyAppealAction failed:', err instanceof Error ? err.message : err);
    throw new AuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, '申诉处理失败，请稍后重试');
  }
}