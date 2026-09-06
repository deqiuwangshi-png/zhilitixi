// 活动上架模块：命令层（写操作）。
// 授权 → zod 校验 → 落库，失败抛稳定 AuthError（不暴露 Supabase 原始错误）。
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
import type { AnnouncementsRow } from '@/lib/db-types';
import { requireActivityManage } from './activity.policy';
import {
  activityDeleteSchema,
  activitySaveSchema,
  activityToggleSchema,
  type ActivitySaveInput,
} from './activity.schema';

/** 落库失败统一转稳定错误，原始信息只落日志不外抛 */
function fail(step: string, err: unknown): never {
  console.error(`[activity] ${step} failed:`, err instanceof Error ? err.message : err);
  throw new AuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, '活动操作失败，请稍后重试');
}

/** 新增 / 编辑活动：activity.manage + 校验 + 落库 */
export async function saveActivity(input: ActivitySaveInput): Promise<void> {
  await requireActivityManage();
  const parsed = activitySaveSchema.safeParse(input);
  if (!parsed.success) {
    throw new AuthError(
      AUTH_ERROR_CODES.VALIDATION_FAILED,
      parsed.error.issues[0]?.message ?? '活动输入不合法'
    );
  }

  const data = parsed.data;
  const payload: Partial<AnnouncementsRow> = {
    kind: data.kind || 'activity',
    icon: 'spark',
    title: data.title,
    description: data.description ?? '',
    sort: data.sort ?? 0,
    active: !!data.active,
  };

  const client = getSupabasePrivilegedClient();
  if (data.id) {
    const { error } = await client.from('announcements').update(payload).eq('id', data.id);
    if (error) fail('updateActivity', error);
    return;
  }
  const { error } = await client.from('announcements').insert(payload);
  if (error) fail('insertActivity', error);
}

/** 上架 / 下架：activity.manage + 校验 + 落库 */
export async function toggleActivity(input: { id: string; active: boolean }): Promise<void> {
  await requireActivityManage();
  const parsed = activityToggleSchema.safeParse(input);
  if (!parsed.success) {
    throw new AuthError(
      AUTH_ERROR_CODES.VALIDATION_FAILED,
      parsed.error.issues[0]?.message ?? '上架/下架输入不合法'
    );
  }

  const { error } = await getSupabasePrivilegedClient()
    .from('announcements')
    .update({ active: !parsed.data.active })
    .eq('id', parsed.data.id);
  if (error) fail('toggleActivity', error);
}

/** 删除活动：activity.manage + 校验 + 落库 */
export async function removeActivity(input: { id: string }): Promise<void> {
  await requireActivityManage();
  const parsed = activityDeleteSchema.safeParse(input);
  if (!parsed.success) {
    throw new AuthError(
      AUTH_ERROR_CODES.VALIDATION_FAILED,
      parsed.error.issues[0]?.message ?? '删除活动输入不合法'
    );
  }

  const { error } = await getSupabasePrivilegedClient()
    .from('announcements')
    .delete()
    .eq('id', parsed.data.id);
  if (error) fail('deleteActivity', error);
}
