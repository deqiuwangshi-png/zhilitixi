// 用户治理模块：查询层（数据访问）。
// 分页/筛选/total 全部在数据库完成，使用 count:'exact'；status/role/anomaly/q 下沉到 where。
import { getSessionRlsClient } from '@/lib/auth/session-client';
import { rowToDto } from './users.mapper';
import { DEFAULT_PAGE_SIZE, SIZES } from './users.schema';
import type { UserItem, UserListQuery, UserPageResult, UserRowData } from './users.types';

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

// 处罚流水分组：单一来源 = src/lib/repos/user-repo（旧仓储层既有实现），消除本地重复实现；
// 返回结构（PenaltyRecord，含 action/reason/operator/at）与 users.types.PenaltyRecord 结构同构，
// 供列表详情抽屉消费。分页下沉见 user-repo 内 TODO。
export { listPenaltiesGrouped } from '@/lib/repos/user-repo';