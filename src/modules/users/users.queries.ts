// 用户治理模块：查询层（数据访问）。
// 分页/筛选/total 全部在数据库完成，使用 count:'exact'；status/role/anomaly/q 下沉到 where。
import { getSessionRlsClient } from '@/lib/auth/session-client';
import { rowToDto } from './users.mapper';
import { DEFAULT_PAGE_SIZE, SIZES } from './users.schema';
import type {
  AuthData,
  PenaltyAction,
  PenaltyRecord,
  UserItem,
  UserListQuery,
  UserPageResult,
  UserRowData,
  VerificationItem,
  VerificationStatus,
} from './users.types';

/** listUsers 的 select 投影列（未含 is_admin） */
const LIST_COLS =
  'id,name,bio,avatar_url,points,created_at,cover_url,badge,gov_status,gov_role,anomaly,penalty_count,ban_until,rate_limit_until';

/** pageSize 白名单收敛，非法值回退默认，禁止固定 limit(500) 式全量拉取 */
function sanitizePageSize(size: number): number {
  return (SIZES as readonly number[]).includes(size) ? size : DEFAULT_PAGE_SIZE;
}

/** 用户列表：数据库级分页 + status/role/anomaly/keyword 下沉过滤 */
export async function listUsers(query: UserListQuery): Promise<UserPageResult<UserItem>> {
  const page = Math.max(1, Math.floor(query.page) || 1);
  const pageSize = sanitizePageSize(query.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // 读取走 RLS 用户客户端（当前请求管理员 token），service-role 仅保留写路径。
  const client = await getSessionRlsClient();
  let builder = client
    .from('users')
    .select(LIST_COLS, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (query.status && query.status !== 'all') {
    builder = builder.eq('gov_status', query.status);
  }
  if (query.role && query.role !== 'all') {
    builder = builder.eq('gov_role', query.role);
  }
  if (query.anomaly === 'yes') {
    builder = builder.not('anomaly', 'is', null).neq('anomaly', '');
  }
  if (query.anomaly === 'no') {
    builder = builder.or('anomaly.is.null,anomaly.eq.\'\'');
  }
  if (query.q?.trim()) {
    builder = builder.ilike('name', `%${query.q.trim()}%`);
  }

  const { data, count } = await builder.range(from, to);
  const rows = (data ?? []) as UserRowData[];
  const total = count ?? 0;

  return {
    rows: rows.map(rowToDto),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** 处罚流水，按 user_id 分组（供列表详情抽屉；Record 便于 RSC 序列化）。
 * 有界预览语义：仅覆盖最近 500 条流水（列表抽屉的"最近处罚"展示），非全量；
 * 全量/按用户分页统计以 users.penalty_count 为准。 */
export async function listPenaltiesGrouped(): Promise<Record<string, PenaltyRecord[]>> {
  const client = await getSessionRlsClient();
  const { data, error } = await client
    .from('governance_penalties')
    .select('id,user_id,action,reason,operator_id,created_at')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(`listPenalties failed: ${error.message}`);
  const rows = data ?? [];

  const operatorIds = Array.from(
    new Set(rows.map((p) => p.operator_id).filter((x): x is string => !!x))
  );
  const names: Record<string, string> = {};
  if (operatorIds.length) {
    const { data: ops } = await client.from('users').select('id,name').in('id', operatorIds);
    for (const o of ops ?? []) names[o.id] = o.name ?? '';
  }

  const map: Record<string, PenaltyRecord[]> = {};
  for (const p of rows) {
    const rec: PenaltyRecord = {
      id: p.id,
      action: p.action as PenaltyAction,
      reason: p.reason ?? '',
      operator: names[p.operator_id ?? ''] ?? '',
      at: p.created_at ?? '',
    };
    (map[p.user_id] ??= []).push(rec);
  }
  return map;
}

/** 认证申请列表 + 状态统计（/user-auth 页；统计全量下沉数据库 count，列表保留有界预览） */
export async function listAuthData(): Promise<AuthData> {
  const client = await getSessionRlsClient();
  const [
    { data: verifications },
    { count: total },
    { count: pending },
    { count: approved },
    { count: totalUsers },
  ] = await Promise.all([
    client
      .from('verifications')
      .select('id,user_id,vtype,statement,status,created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    client.from('verifications').select('id', { count: 'exact', head: true }),
    client.from('verifications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    client.from('verifications').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    client.from('users').select('id', { count: 'exact', head: true }),
  ]);
  const rows = verifications ?? [];

  // 联表用户名
  const userIds = new Set<string>();
  for (const v of rows) if (v.user_id) userIds.add(v.user_id);
  const userNames: Record<string, string> = {};
  if (userIds.size) {
    const { data: users } = await client.from('users').select('id,name').in('id', Array.from(userIds));
    for (const u of users ?? []) userNames[u.id] = u.name ?? '';
  }

  const items: VerificationItem[] = rows.map((v) => ({
    id: v.id,
    userId: v.user_id,
    vtype: v.vtype,
    statement: v.statement,
    status: (v.status as VerificationStatus) || 'pending',
    createdAt: v.created_at,
    userName: userNames[v.user_id ?? ''] || '用户',
  }));

  return {
    verifications: items,
    totalVerifications: total ?? 0,
    pendingCount: pending ?? 0,
    approvedCount: approved ?? 0,
    rejectedCount: (total ?? 0) - (pending ?? 0) - (approved ?? 0),
    totalUsers: totalUsers ?? 0,
  };
}