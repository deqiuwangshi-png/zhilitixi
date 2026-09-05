// 活动上架模块：查询层（数据访问）。
// 分页/筛选/total 全部在数据库完成，使用 count:'exact'；kind/q 下沉到 where。
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import { rowToDto } from './activity.mapper';
import { DEFAULT_PAGE_SIZE, SIZES } from './activity.schema';
import type { ActivityItem, ActivityListQuery, ActivityPageResult, ActivityRowData } from './activity.types';

/** listActivities 的 select 投影列 */
const LIST_COLS =
  'id,kind,icon,title,description,link,image_url,sort,active,starts_at,ends_at,created_at';

/** pageSize 白名单收敛，非法值回退默认，禁止固定 limit(500) 式全量拉取 */
function sanitizePageSize(size: number): number {
  return (SIZES as readonly number[]).includes(size) ? size : DEFAULT_PAGE_SIZE;
}

/** 活动列表：数据库级分页 + kind/关键字 下沉过滤 */
export async function listActivities(query: ActivityListQuery): Promise<ActivityPageResult<ActivityItem>> {
  const page = Math.max(1, Math.floor(query.page) || 1);
  const pageSize = sanitizePageSize(query.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const client = getSupabasePrivilegedClient();
  let builder = client
    .from('announcements')
    .select(LIST_COLS, { count: 'exact' })
    .order('sort', { ascending: true })
    .order('created_at', { ascending: false });

  if (query.kind && query.kind !== 'all') {
    builder = builder.eq('kind', query.kind);
  }
  if (query.q?.trim()) {
    const q = query.q.trim();
    builder = builder.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const { data, count } = await builder.range(from, to);
  const rows = (data ?? []) as ActivityRowData[];
  const total = count ?? 0;

  return {
    rows: rows.map(rowToDto),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** 全量活动（供顶部统计卡：总数 / 上架中 / 已下线），与旧 activity-repo.listActivities 行为一致 */
export async function listAllActivities(): Promise<ActivityItem[]> {
  const { data, error } = await getSupabasePrivilegedClient()
    .from('announcements')
    .select(LIST_COLS)
    .order('sort', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(`listAllActivities failed: ${error.message}`);
  return (data ?? []).map(rowToDto);
}