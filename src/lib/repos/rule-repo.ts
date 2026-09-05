// 规则与处罚仓储层：域名规则 + 违规记录，域名操作按主键 domain 精确定位。
// TODO(阶段六): listRules 已迁移至 src/modules/rules/rules.queries.ts（violations 的
// risk 筛选下沉到数据库 where，不再全量拉取后内存 filter），写操作经 commands 复用
// 本文件的 applyRuleAction。以下导出保留供旧前端组件（从 @/lib/repos/rule-repo 引用
// RuleData）兼容，勿删仍被引用的导出。
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import type { LinkDomainsRow, UrlAuditRow } from '@/lib/db-types';

export interface RuleData {
  domains: LinkDomainsRow[];
  violations: UrlAuditRow[];
  userNames: Record<string, string>;
}

/** 域名规则 + 违规记录（url_audit 高风险/中风险）+ 用户名联表 */
export async function listRules(): Promise<RuleData> {
  const client = getSupabasePrivilegedClient();
  const [{ data: domains }, { data: urlAudits }] = await Promise.all([
    client.from('link_domains').select('*').order('created_at', { ascending: false }).limit(500),
    client.from('url_audit').select('*').order('created_at', { ascending: false }).limit(200),
  ]);
  const violations = (urlAudits ?? []).filter((u) => u.risk === 'high' || u.risk === 'medium');

  const userIds = new Set(violations.map((v) => v.user_id).filter((x): x is string => !!x));
  const userNames: Record<string, string> = {};
  if (userIds.size) {
    const { data: users } = await client.from('users').select('id,name').in('id', Array.from(userIds));
    for (const u of users ?? []) userNames[u.id] = u.name ?? '';
  }

  return { domains: domains ?? [], violations, userNames };
}

export interface RuleActionInput {
  action: 'addDomain' | 'toggleDomain' | 'deleteDomain';
  domain: string;
  kind?: 'trusted' | 'blocked';
  note?: string;
}

/** 域名规则操作：新增（upsert）/ 切换黑白 / 删除（修复原按 id 定位失效问题） */
export async function applyRuleAction(input: RuleActionInput): Promise<void> {
  const client = getSupabasePrivilegedClient();
  const { action, domain, kind, note } = input;

  if (action === 'deleteDomain') {
    const { error } = await client.from('link_domains').delete().eq('domain', domain);
    if (error) throw new Error(`deleteDomain failed: ${error.message}`);
    return;
  }

  // addDomain / toggleDomain：按 domain upsert（link_domains 主键即 domain）
  const exists = await client.from('link_domains').select('kind,note').eq('domain', domain).maybeSingle();
  if (exists.error) throw new Error(`upsert domain failed: ${exists.error.message}`);
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
    if (error) throw new Error(`upsert domain failed: ${error.message}`);
  } else {
    const { error } = await client
      .from('link_domains')
      .insert({ domain, kind: kind ?? 'trusted', note: note ?? '' });
    if (error) throw new Error(`upsert domain failed: ${error.message}`);
  }
}
