// 侵权与申诉模块：查询层（数据访问）。
// 申诉列表 = discoveries（reason 非空）∪ square_posts（url_status='blocked'）跨表合并。
// 009 迁移新增只读视图 v_appeal_catalog，在数据库层完成 UNION 合并；本层对视图执行
// 全局 count:'exact' + order，根治旧“每表 limit(100) + 合并”导致的丢行 / 截断 / 失序。
// 说明：当前申诉为“全量待复核队列”，前端为无分页的简单列表（props 形状固定），故
// queries 返回全部匹配行 + total（不再有每表硬上限，也非“固定 limit 模拟分页”）；
// 白名单 pageSize 能力在 schema 中预留，后续若接分页 UI 可直接复用。
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import { rowToDto } from './appeal.mapper';
import type { AppealItem, AppealListQuery, AppealPageResult, AppealRowData } from './appeal.types';

/** 联表用户名（仅回查返回窗口对应的作者，避免整表拉取） */
async function fetchAuthorNames(ids: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(ids.filter((x): x is string => !!x)));
  if (!unique.length) return {};
  const client = getSupabasePrivilegedClient();
  const { data } = await client.from('users').select('id,name').in('id', unique);
  const names: Record<string, string> = {};
  for (const u of data ?? []) names[u.id] = u.name ?? '';
  return names;
}

/**
 * 申诉案件列表：基于 v_appeal_catalog 全局 count + order 的全量队列查询。
 * （无分页 UI，返回全部匹配行；无每表 limit，无内存筛选。）
 */
export async function listAppeals(query: AppealListQuery): Promise<AppealPageResult<AppealItem>> {
  const client = getSupabasePrivilegedClient();
  const builder = client
    .from('v_appeal_catalog')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  const { data, count, error } = await builder;
  if (error) throw new Error(`listAppeals(v_appeal_catalog) failed: ${error.message}`);
  const rows = (data ?? []) as AppealRowData[];

  const userNames = await fetchAuthorNames(rows.map((r) => r.author_id ?? ''));

  const items: AppealItem[] = rows.map((r) => rowToDto(r, userNames));
  const total = count ?? 0;

  return {
    rows: items,
    total,
    page: Math.max(1, Math.floor(query.page) || 1),
    pageSize: query.pageSize || items.length || 1,
    totalPages: Math.max(1, Math.ceil(total / (query.pageSize || items.length || 1))),
  };
}