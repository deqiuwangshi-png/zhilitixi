import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import type { Database } from '@/lib/db-types';

/**
 * 治理体系的共享数据访问库。
 * 全部通过 service-role 客户端对用户 Supabase 主库读写。
 */

export function db() {
  return getSupabasePrivilegedClient();
}

/** 拉取用户 id -> name 映射，用于列表联表展示 */
export async function fetchUserNames(ids: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {};
  const { data, error } = await db()
    .from('users')
    .select('id,name')
    .in('id', unique);
  if (error) throw new Error(`fetch users failed: ${error.message}`);
  const map: Record<string, string> = {};
  for (const u of data ?? []) map[u.id] = u.name || '用户';
  return map;
}

type Row = Record<string, unknown>;

/** 组织一个表格卡片的分组统计数据 */
export function groupByStatus(
  rows: Row[],
  key = 'status',
  order: string[] = []
): { key: string; count: number }[] {
  const counter = new Map<string, number>();
  for (const r of rows) {
    const v = String(r?.[key] ?? '未知');
    counter.set(v, (counter.get(v) ?? 0) + 1);
  }
  const entries = Array.from(counter.entries());
  if (order.length) {
    entries.sort((a, b) => {
      const ia = order.indexOf(a[0]);
      const ib = order.indexOf(b[0]);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  } else {
    entries.sort((a, b) => b[1] - a[1]);
  }
  return entries.map(([key, count]) => ({ key, count }));
}

/** 计算 count 聚合（如需过滤 NULL 请改用 .is() 语法） */
export async function countRows(
  table: keyof Database['public']['Tables'],
  filter?: { column: string; value: string | number | boolean }
): Promise<number> {
  let q = db().from(table).select('*', { count: 'exact', head: true });
  if (filter) q = q.eq(filter.column, filter.value);
  const { count, error } = await q;
  if (error) throw new Error(`count ${table} failed: ${error.message}`);
  return count ?? 0;
}