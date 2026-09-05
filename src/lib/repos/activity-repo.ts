// 活动上架仓储层：announcements 列表 + 新增/编辑/上架/删除写操作。
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import type { AnnouncementsRow } from '@/lib/db-types';

export type ActivityItem = AnnouncementsRow;

// 注：列表查询已迁移至 src/modules/activity/activity.queries.ts（listActivities 支持分页），
// 旧仓储层不再保留固定 limit(100) 的全表拉取。

export interface ActivitySaveInput {
  id?: string;
  kind: string;
  title: string;
  description?: string;
  sort?: number;
  active?: boolean;
}

/** 新增或更新活动（payload 精确对齐 announcements 列） */
export async function saveActivity(input: ActivitySaveInput): Promise<void> {
  const payload: Partial<AnnouncementsRow> = {
    kind: input.kind || 'activity',
    icon: 'spark',
    title: input.title,
    description: input.description ?? '',
    sort: input.sort ?? 0,
    active: !!input.active,
  };
  if (input.id) {
    const { error } = await getSupabasePrivilegedClient().from('announcements').update(payload).eq('id', input.id);
    if (error) throw new Error(`saveActivity failed: ${error.message}`);
  } else {
    const { error } = await getSupabasePrivilegedClient().from('announcements').insert(payload);
    if (error) throw new Error(`saveActivity failed: ${error.message}`);
  }
}

/** 上架 / 下架（active 取反） */
export async function toggleActivity(id: string, active: boolean): Promise<void> {
  const { error } = await getSupabasePrivilegedClient()
    .from('announcements')
    .update({ active: !active })
    .eq('id', id);
  if (error) throw new Error(`toggleActivity failed: ${error.message}`);
}

/** 删除活动 */
export async function deleteActivity(id: string): Promise<void> {
  const { error } = await getSupabasePrivilegedClient().from('announcements').delete().eq('id', id);
  if (error) throw new Error(`deleteActivity failed: ${error.message}`);
}
