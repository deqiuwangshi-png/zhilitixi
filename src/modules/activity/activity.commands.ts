// 活动上架模块：命令层（写操作）。
// 授权 → zod 校验 → 落库，失败抛稳定 AuthError（不暴露 Supabase 原始错误）。
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
import {
  saveActivity as repoSaveActivity,
  toggleActivity as repoToggleActivity,
  deleteActivity as repoDeleteActivity,
} from '@/lib/repos/activity-repo';
import { requireActivityManage } from './activity.policy';
import {
  activityDeleteSchema,
  activitySaveSchema,
  activityToggleSchema,
  type ActivitySaveInput,
} from './activity.schema';

/** 新增 / 编辑活动：activity.manage + 校验 + 复用既有仓库逻辑 */
export async function saveActivity(input: ActivitySaveInput): Promise<void> {
  await requireActivityManage();
  const parsed = activitySaveSchema.safeParse(input);
  if (!parsed.success) {
    throw new AuthError(
      AUTH_ERROR_CODES.VALIDATION_FAILED,
      parsed.error.issues[0]?.message ?? '活动输入不合法'
    );
  }
  await repoSaveActivity(parsed.data);
}

/** 上架 / 下架：activity.manage + 校验 + 复用既有仓库逻辑 */
export async function toggleActivity(input: { id: string; active: boolean }): Promise<void> {
  await requireActivityManage();
  const parsed = activityToggleSchema.safeParse(input);
  if (!parsed.success) {
    throw new AuthError(
      AUTH_ERROR_CODES.VALIDATION_FAILED,
      parsed.error.issues[0]?.message ?? '上架/下架输入不合法'
    );
  }
  await repoToggleActivity(parsed.data.id, parsed.data.active);
}

/** 删除活动：activity.manage + 校验 + 复用既有仓库逻辑 */
export async function removeActivity(input: { id: string }): Promise<void> {
  await requireActivityManage();
  const parsed = activityDeleteSchema.safeParse(input);
  if (!parsed.success) {
    throw new AuthError(
      AUTH_ERROR_CODES.VALIDATION_FAILED,
      parsed.error.issues[0]?.message ?? '删除活动输入不合法'
    );
  }
  await repoDeleteActivity(parsed.data.id);
}