// 规则与处罚模块：查询层（数据访问）。
// 域名规则（link_domains）+ 违规记录（url_audit 高风险/中风险）+ 用户名联表。
// 无分页 UI，返回全量展示列表；违规记录的 risk 筛选下沉到数据库 where.in(...)，
// 根治旧“全量 limit(200) + 内存 filter(high/medium)”的内存筛选反模式。
import { getSessionRlsClient } from '@/lib/auth/session-client';
import { toRows } from './rules.mapper';
import type { UrlAuditRow } from '@/lib/db-types';
import type { RuleData } from './rules.types';

/** 域名规则 + 违规记录（url_audit 高风险/中风险，risk 筛选在数据库完成） */
export async function listRules(): Promise<RuleData> {
  // 读取走 RLS 用户客户端（当前请求管理员 token），service-role 仅保留写路径。
  const client = await getSessionRlsClient();
  const [{ data: domains }, { data: urlAudits }] = await Promise.all([
    client.from('link_domains').select('*').order('created_at', { ascending: false }),
    client
      .from('url_audit')
      .select('*')
      .order('created_at', { ascending: false })
      .in('risk', ['high', 'medium']),
  ]);
  const violations = toRows(urlAudits as UrlAuditRow[] | null);

  const userIds = Array.from(new Set(violations.map((v) => v.user_id).filter((x): x is string => !!x)));
  const userNames: Record<string, string> = {};
  if (userIds.length) {
    const { data: users } = await client.from('users').select('id,name').in('id', userIds);
    for (const u of users ?? []) userNames[u.id] = u.name ?? '';
  }

  return { domains: toRows(domains), violations, userNames };
}