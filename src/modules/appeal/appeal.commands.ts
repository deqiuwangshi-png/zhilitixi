// 侵权与申诉模块：命令层（写操作）。
// 授权 → zod 校验 → 落库（service-role），失败抛稳定 AuthError（不暴露 Supabase 原始错误）。
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import { requireAppealManage } from './appeal.policy';
import { appealActionSchema, type AppealActionInput } from './appeal.schema';

/**
 * 申诉处理：restore 恢复发布 / dismiss 维持处罚。
 * discovery：reason 清空（恢复）或写"申诉不成立，维持原判"（驳回）；
 * square：恢复发布 = url_status 解除 blocked；维持处罚 = 保持 blocked（无需写入）。
 */
export async function applyAppeal(input: AppealActionInput): Promise<void> {
  await requireAppealManage();
  const parsed = appealActionSchema.safeParse(input);
  if (!parsed.success) {
    throw new AuthError(
      AUTH_ERROR_CODES.VALIDATION_FAILED,
      parsed.error.issues[0]?.message ?? '申诉输入不合法',
    );
  }

  const client = getSupabasePrivilegedClient();
  const { source, id, action } = parsed.data;
  try {
    if (source === 'discovery') {
      const { error } = await client
        .from('discoveries')
        .update({ reason: action === 'restore' ? null : '申诉不成立，维持原判' })
        .eq('id', id);
      if (error) throw new Error(error.message);
    } else if (action === 'restore') {
      const { error } = await client
        .from('square_posts')
        .update({ url_status: 'normal' })
        .eq('id', id);
      if (error) throw new Error(error.message);
    }
  } catch (err) {
    console.error('[appeal] applyAppeal failed:', err instanceof Error ? err.message : err);
    throw new AuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, '申诉处理失败，请稍后重试');
  }
}
