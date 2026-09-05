// 风控中心模块：查询层（数据访问）。
// url_audit / link_domains / upload_audit 三数据源：
// - url / upload tab 为无分页全量展示（前端无分页器），按 created_at 倒序有界拉取，
//   无每表硬上限式的分页模拟；
// - domain tab 为唯一 DB 分页检索（count:'exact' + order + range，q 下沉到 WHERE），
//   根治旧“limit(500) 全量 + 内存 filter + slice”的模拟分页。
// 同时返回全量 domains 供顶部“黑名单域名”统计卡使用。
import { getSessionRlsClient } from '@/lib/auth/session-client';
import { toRows } from './risk.mapper';
import { DEFAULT_PAGE_SIZE, SIZES } from './risk.schema';
import type { LinkDomainsRow, UploadAuditRow, UrlAuditRow } from '@/lib/db-types';
import type { RiskListData, RiskListQuery } from './risk.types';

/** pageSize 白名单收敛，非法值回退默认 */
function sanitizePageSize(size: number): number {
  return (SIZES as readonly number[]).includes(size) ? size : DEFAULT_PAGE_SIZE;
}

/** URL 巡检行作者名联表（仅窗口对应作者） */
async function fetchUserNames(urlRows: UrlAuditRow[]): Promise<Record<string, string>> {
  const ids = Array.from(new Set(urlRows.map((r) => r.user_id).filter((x): x is string => !!x)));
  if (!ids.length) return {};
  const client = await getSessionRlsClient();
  const { data: users } = await client.from('users').select('id,name').in('id', ids);
  const names: Record<string, string> = {};
  for (const u of users ?? []) names[u.id] = u.name ?? '';
  return names;
}

/**
 * 风控中心列表：三数据源查询 + domain tab DB 分页检索。
 * - urlAudits / uploadAudits：无分页 UI，按时间倒序有界拉取（供列表与统计卡）。
 * - domains：全量（动态）供顶部统计；分页行 pageDomains 由 DB range 计算。
 * - domain 检索（q）下沉到 link_domains.domain / note 的 ilike。
 */
export async function listRiskData(query: RiskListQuery): Promise<RiskListData> {
  // 读取走 RLS 用户客户端（当前请求管理员 token），service-role 仅保留写路径。
  const client = await getSessionRlsClient();
  const page = Math.max(1, Math.floor(query.page) || 1);
  const pageSize = sanitizePageSize(query.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // url / upload：无分页，按时间倒序有界拉取
  const [urlAudits, uploadAudits, domainHeader] = await Promise.all([
    client.from('url_audit').select('*').order('created_at', { ascending: false }),
    client.from('upload_audit').select('*').order('created_at', { ascending: false }),
    client.from('link_domains').select('*').order('created_at', { ascending: true }),
  ]);

  const urlRows = toRows(urlAudits.data as UrlAuditRow[] | null);
  const uploadRows = toRows(uploadAudits.data as UploadAuditRow[] | null);
  const allDomains = toRows(domainHeader.data as LinkDomainsRow[] | null);

  // domain tab：DB 级检索 + count exact + range 分页
  let domainBuilder = client
    .from('link_domains')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: true });
  if (query.q?.trim()) {
    const kw = query.q.trim();
    domainBuilder = domainBuilder.or(`domain.ilike.%${kw}%,note.ilike.%${kw}%`);
  }
  const { data: pageDomainData, count, error } = await domainBuilder.range(from, to);
  if (error) throw new Error(`listRiskData(link_domains paginate) failed: ${error.message}`);
  const pageDomains = toRows(pageDomainData as LinkDomainsRow[] | null);
  const total = count ?? 0;

  const userNames = await fetchUserNames(urlRows);

  return {
    urlAudits: urlRows,
    domains: allDomains,
    uploadAudits: uploadRows,
    userNames,
    pageDomains,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}