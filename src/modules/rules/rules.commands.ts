// 规则与处罚模块：命令层（写操作）。
// 授权 → zod 校验 → 落库，失败抛稳定 AuthError（不暴露 Supabase 原始错误）。
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
import { requireRuleManage } from './rules.policy';
import { ruleActionSchema, type RuleActionInput } from './rules.schema';

/** 落库失败统一转稳定错误，原始信息只落日志不外抛 */
function fail(step: string, err: unknown): never {
  console.error(`[rules] ${step} failed:`, err instanceof Error ? err.message : err);
  throw new AuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, '域名操作失败，请稍后重试');
}

/** 域名规则操作（新增 / 切换黑白 / 删除）：rule.manage + 校验 + 落库 */
export async function applyRule(input: RuleActionInput): Promise<void> {
  await requireRuleManage();

  const parsed = ruleActionSchema.safeParse(input);
  if (!parsed.success) {
    throw new AuthError(
      AUTH_ERROR_CODES.VALIDATION_FAILED,
      parsed.error.issues[0]?.message ?? '域名操作输入不合法',
    );
  }

  const client = getSupabasePrivilegedClient();
  const { action, domain } = parsed.data;
  // discriminated union：kind / note 仅 addDomain 分支存在
  const kind = 'kind' in parsed.data ? parsed.data.kind : undefined;
  const note = 'note' in parsed.data ? parsed.data.note : undefined;

  if (action === 'deleteDomain') {
    const { error } = await client.from('link_domains').delete().eq('domain', domain);
    if (error) fail('deleteDomain', error);
    return;
  }

  // addDomain / toggleDomain：按 domain upsert（link_domains 主键即 domain）
  const exists = await client.from('link_domains').select('kind,note').eq('domain', domain).maybeSingle();
  if (exists.error) fail('queryDomain', exists.error);

  if (exists.data) {
    const nextKind =
      action === 'toggleDomain'
        ? exists.data.kind === 'trusted'
          ? 'blocked'
          : 'trusted'
        : (kind ?? exists.data.kind ?? 'trusted');
    const { error } = await client
      .from('link_domains')
      .update({ kind: nextKind, note: note ?? exists.data.note ?? '' })
      .eq('domain', domain);
    if (error) fail('updateDomain', error);
    return;
  }

  const { error } = await client
    .from('link_domains')
    .insert({ domain, kind: kind ?? 'trusted', note: note ?? '' });
  if (error) fail('insertDomain', error);
}
