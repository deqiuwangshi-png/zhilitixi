// 举报处理模块：查询层（数据访问）。
// 分页/筛选/total 全部在数据库完成（repeat 除外）。status/type/reason 全部下沉到 where
// （type/reason 按归一化中文逆向映射回原始值做 in() 过滤）；q 先对 users.name 做参数化
// ilike 检索得到匹配用户 id 数组，再以 or() 过滤主查询（用户输入仅作为 ilike 绑定值传入，
// or() 字符串骨架仅由数据库返回的 UUID 填充，消除拼接注入面）。
// reportNo 为页内计算字段（非数据库列），无法下沉，故 keyword 检索不含编号。
// total 语义：
//  - 未开启 repeat：基于数据库 count:'exact' 的 status/type/reason/q 口径。
//  - 开启 repeat：在 queries 内对「同筛选条件(status/type/reason/q)、不含 range」的目标
//    target_id 做一次聚合，以该聚合集内 count(*)>=2 判定重复目标，total 取这些重复目标的
//    举报记录数，与返回行数（重复目标举报记录）口径一致，totalPages 不夸大也不截断。
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSessionRlsClient } from '@/lib/auth/session-client';
import type { Database } from '@/lib/db-types';
import { contentTypeMap, reasonMap, rowToDto } from './report.mapper';
import { SIZES } from './report.schema';
import type {
  ReportItem,
  ReportListQuery,
  ReportListRow,
  ReportPageResult,
  RowToDtoContext,
} from './report.types';

/** 列表主查询投影列（保持字面量以便 supabase-js 推导行类型） */
const COLS = 'id,reporter_id,target_type,target_id,reason,status,created_at';

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
async function fetchUserNames(client: SupabaseClient<Database>, rows: ReportListRow[]): Promise<Record<string, string>> {
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

/**
 * 关键词匹配用户名 → 用户 id 数组（参数化 ilike，无拼接注入面）。
 * 返回空数组表示无匹配用户（此时应直接返回空结果，避免 in() 空数组非法）。
 */
async function resolveKeywordUserIds(
  client: SupabaseClient<Database>,
  kw: string,
): Promise<string[]> {
  const { data } = await client.from('users').select('id').ilike('name', `%${kw}%`);
  return (data ?? []).map((u) => u.id);
}

/** 对「同筛选条件、不含 range」的目标聚合，返回重复目标(>=2)的举报记录总数 */
async function repeatTotalReportCount(
  client: SupabaseClient<Database>,
  query: ReportListQuery,
  matchedIds: string[] | null,
): Promise<number> {
  let agg = client.from('reports').select('target_id', { count: 'exact' });
  if (query.status && isDbStatus(query.status)) agg = agg.eq('status', query.status);
  if (query.type) {
    const raws = reverseMap(contentTypeMap, query.type);
    if (raws.length) agg = agg.in('target_type', raws);
  }
  if (query.reason) {
    const raws = reverseMap(reasonMap, query.reason);
    if (raws.length) agg = agg.in('reason', raws);
  }
  // 与页面查询的 q 过滤保持一致（跨列 OR；仅插值数据库返回的 UUID，无注入面）
  if (matchedIds && matchedIds.length) {
    agg = agg.or(
      `reporter_id.in.(${matchedIds.join(',')}),target_id.in.(${matchedIds.join(',')})`,
    );
  }

  const { data } = await agg;
  const counts = new Map<string, number>();
  for (const r of data ?? []) {
    if (!r.target_id) continue;
    counts.set(r.target_id, (counts.get(r.target_id) ?? 0) + 1);
  }
  let total = 0;
  for (const c of counts.values()) if (c >= 2) total += c;
  return total;
}

/** 举报列表：数据库分页 + status in 过滤 + 页内侧后置过滤 */
export async function listReports(
  query: ReportListQuery,
): Promise<ReportPageResult<ReportItem>> {
  const page = Math.max(1, Math.floor(query.page) || 1);
  const pageSize = sanitizePageSize(query.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // 读取走 RLS 用户客户端（当前请求管理员 token），service-role 仅保留写路径。
  const client = await getSessionRlsClient();
  // 关键词 → 匹配用户 id（参数化）。匹配为空直接返回空结果，避免 in() 空数组非法。
  let matchedIds: string[] | null = null;
  if (query.q?.trim()) {
    matchedIds = await resolveKeywordUserIds(client, query.q.trim());
    if (!matchedIds.length) {
      return { rows: [], total: 0, page, pageSize, totalPages: 1 };
    }
  }

  let builder = client
    .from('reports')
    .select(COLS, {
      count: 'exact',
    })
    .order('created_at', { ascending: false });
  // 状态筛选（DB_STATUS_FILTERABLE 白名单）
  if (query.status && isDbStatus(query.status)) builder = builder.eq('status', query.status);
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
  // 用户名检索（举报人 / 被举报用户，任一侧命中即匹配）。chained .in('reporter_id')
  // + .in('target_id') 是 AND 语义无法表达"任一侧命中"，故沿用 or()；此处 or() 内仅
  // 插值数据库返回的 UUID，不含任何用户输入，无注入面。
  if (matchedIds && matchedIds.length) {
    builder = builder.or(
      `reporter_id.in.(${matchedIds.join(',')}),target_id.in.(${matchedIds.join(',')})`,
    );
  }

  const { data, count } = await builder.range(from, to);
  const rows: ReportListRow[] = data ?? [];

  // total 口径：未开启 repeat 用数据库 count:'exact'；开启 repeat 用同条件聚合的重复目标
  // 举报记录数（与返回行数口径一致，见 repeatTotalReportCount）。
  const total = query.repeat
    ? await repeatTotalReportCount(client, query, matchedIds)
    : (count ?? 0);

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