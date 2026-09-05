// 规则与处罚模块：命令层（写操作）。
// 授权 → zod 校验 → 落库，失败抛稳定 AuthError（不暴露 Supabase 原始错误）。
// 写操作复用旧 rule-repo.applyRuleAction（加名单 / 切换 / 删除）。
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
import { applyRuleAction as repoApplyRuleAction } from '@/lib/repos/rule-repo';
import { requireRuleManage } from './rules.policy';
import { ruleActionSchema, type RuleActionInput } from './rules.schema';

/** 域名规则操作（加名单 / 切换 / 删除）：rule.manage + 校验 + 复用既有仓库逻辑 */
export async function applyRule(input: RuleActionInput): Promise<void> {
  await requireRuleManage();
  const parsed = ruleActionSchema.safeParse(input);
  if (!parsed.success) {
    throw new AuthError(
      AUTH_ERROR_CODES.VALIDATION_FAILED,
      parsed.error.issues[0]?.message ?? '域名操作输入不合法',
    );
  }
  try {
    await repoApplyRuleAction(parsed.data);
  } catch (err) {
    console.error('[rules] applyRuleAction failed:', err instanceof Error ? err.message : err);
    throw new AuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, '域名操作失败，请稍后重试');
  }
}