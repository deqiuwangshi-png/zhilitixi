// 举报处理模块：查询层（数据访问）。
// 分页/筛选/total 全部在数据库完成，使用 count:'exact'。
// status/type/reason/q 全部下沉到 where（type/reason 按归一化中文逆向映射回原始值
// 做 in() 过滤；q 对举报人/被举报用户名做子查询匹配）。reportNo 为页内计算字段
// （非数据库列），无法下沉，故 keyword 不含编号搜索。
// total 语义：基于数据库 count 的 status/type/reason/q 过滤口径；而 repeat（重复举报
// 标记）依赖跨页统计无法下沉，仅作为当前页的补充标记（r.repeatCount >= 2），
// 不影响 total 口径，不做夸大。
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { contentTypeMap, reasonMap, rowToDto } from './report.mapper';
import { SIZES } from './report.schema';
import type {
  ReportItem,
  ReportListQuery,
  ReportListRow,
  ReportPageResult,
  RowToDtoContext,
} from './report.types';

/** 可在数据库按 status in 过滤的状态值白名单 */
const DB_STATUS_FILTERABLE = [
  'pending',
  'approved',
  'resolved',
  'normal',
  'rejected',
  'ignored',
  'blocked',
] as const;
type DbStatus = (typeof DB_STATUS_FILTERABLE)[number];

function isDbStatus(v: string): v is DbStatus {
  return (DB_STATUS_FILTERABLE as readonly string[]).includes(v);
}

/** pageSize 白名单收敛，非法值回退 20，禁止固定 limit(500) */
function sanitizePageSize(size: number): number {
  return (SIZES as readonly number[]).includes(size) ? size : 20;
}

/** 页内用户名联表（举报人 + 被举报用户） */
async function fetchUserNames(client: ReturnType<typeof getSupabaseClient>, rows: ReportListRow[]): Promise<Record<string, string>> {
  const userIds = new Set<string>();
  for (const r of rows) {
    if (r.reporter_id) userIds.add(r.reporter_id);
    if (r.target_type === 'user' && r.target_id) userIds.add(r.target_id);
  }
  if (!userIds.size) return {};
  const { data: us } = await client.from('users').select('id,name').in('id', Array.from(userIds));
  const names: Record<string, string> = {};
  for (const x of us ?? []) names[x.id] = x.name ?? '';
  return names;
}

/** 页内重复次数统计（同一被举报目标） */
function buildRepeatMap(rows: ReportListRow[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of rows) {
    if (r.target_id) map[r.target_id] = (map[r.target_id] ?? 0) + 1;
  }
  return map;
}

/** 归一化中文 → 原始值（reverse of contentTypeMap/reasonMap），供 DB in() 过滤 */
function reverseMap(map: Record<string, string>, target: string): string[] {
  const out: string[] = [];
  for (const [raw, norm] of Object.entries(map)) {
    if (norm === target) out.push(raw);
  }
  return out;
}

/** 当前页内侧后置过滤（仅剩 repeat 补充标记；type/reason/q 已下沉到数据库 where） */
function applyInPageFilter(rows: ReportItem[], query: ReportListQuery): ReportItem[] {
  let filtered = rows;
  if (query.repeat) filtered = filtered.filter((r) => r.repeatCount >= 2);
  return filtered;
}

/** 举报列表：数据库分页 + status in 过滤 + 页内侧后置过滤 */
export async function listReports(
  query: ReportListQuery,
): Promise<ReportPageResult<ReportItem>> {
  const page = Math.max(1, Math.floor(query.page) || 1);
  const pageSize = sanitizePageSize(query.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const client = getSupabaseClient();
  let builder = client
    .from('reports')
    .select('id,reporter_id,target_type,target_id,reason,status,created_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false });
  if (query.status && isDbStatus(query.status)) {
    builder = builder.eq('status', query.status);
  }
  // 内容类型筛选（归一化中文 → 原始 target_type）下沉到 where
  if (query.type) {
    const raws = reverseMap(contentTypeMap, query.type);
    if (raws.length) builder = builder.in('target_type', raws);
  }
  // 举报理由筛选（归一化中文 → 原始 reason）下沉到 where
  if (query.reason) {
    const raws = reverseMap(reasonMap, query.reason);
    if (raws.length) builder = builder.in('reason', raws);
  }
  // 用户名搜索下沉到 where（举报人 / 被举报用户，子查询匹配 users.name）。
  // reportNo 为计算字段无法下沉，故 keyword 检索不含编号。
  if (query.q?.trim()) {
    const kw = query.q.trim();
    builder = builder.or(
      `reporter_id.in.(select id from public.users where name.ilike.%${kw}%),` +
        `target_id.in.(select id from public.users where name.ilike.%${kw}%)`,
    );
  }

  const { data, count } = await builder.range(from, to);
  const rows: ReportListRow[] = data ?? [];
  const total = count ?? 0;

  const ctx: RowToDtoContext = {
    userNames: await fetchUserNames(client, rows),
    repeatMap: buildRepeatMap(rows),
  };

  const dtoRows = rows.map((r, i) => rowToDto(r, from + i, ctx));
  const filtered = applyInPageFilter(dtoRows, query);

  return {
    rows: filtered,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}