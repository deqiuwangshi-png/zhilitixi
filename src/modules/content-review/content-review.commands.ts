// 内容审核模块：命令层（写操作）。
// 授权（policy）→ 校验（zod）→ 落库；失败抛稳定 AuthError，不暴露 Supabase 原始错误。
// 三表分别写各自审核栏位（review_status / url_status / risk），单条写不涉及用户治理状态，
// 无需 apply_governance_action 事务 RPC。
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
import { requireReviewApply } from './content-review.policy';
import { reviewActionSchema, type ReviewActionInput } from './content-review.schema';

/** 单条审核写库（按内容来源路由到对应表；写错抛稳定 AuthError） */
async function applyReviewWrite(input: ReviewActionInput): Promise<void> {
  const client = getSupabaseClient();
  const { source, id, action, reason } = input;

  if (source === 'discovery') {
    const { error } = await client
      .from('discoveries')
      .update({
        review_status: action === 'approve' ? 'approved' : 'rejected',
        reason: action === 'approve' ? null : reason || '已驳回',
      })
      .eq('id', id);
    if (error) {
      // 稳定文案对外；原始错误只落日志
      console.error('[content-review] applyReviewWrite failed:', error.message);
      throw new AuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, '内容审核失败，请稍后重试');
    }
  } else if (source === 'square') {
    // 拍板语义：驳回只标记 blocked，保留 url 字段可回溯
    const { error } = await client
      .from('square_posts')
      .update({
        review_status: action === 'approve' ? 'approved' : 'rejected',
        url_status: action === 'approve' ? 'normal' : 'blocked',
      })
      .eq('id', id);
    if (error) {
      // 稳定文案对外；原始错误只落日志
      console.error('[content-review] applyReviewWrite failed:', error.message);
      throw new AuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, '内容审核失败，请稍后重试');
    }
  } else {
    // url_audit 以 risk 承载审核状态（id 为 int64）
    const { error } = await client
      .from('url_audit')
      .update({ risk: action === 'approve' ? 'low' : 'high' })
      .eq('id', Number(id));
    if (error) {
      // 稳定文案对外；原始错误只落日志
      console.error('[content-review] applyReviewWrite failed:', error.message);
      throw new AuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, '内容审核失败，请稍后重试');
    }
  }
}

/** 单条审核（通过 / 驳回）：review.apply + 校验 + 单表写 */
export async function reviewItem(input: ReviewActionInput): Promise<void> {
  await requireReviewApply();
  const parsed = reviewActionSchema.safeParse(input);
  if (!parsed.success) {
    throw new AuthError(
      AUTH_ERROR_CODES.VALIDATION_FAILED,
      parsed.error.issues[0]?.message ?? '审核输入不合法',
    );
  }
  await applyReviewWrite(parsed.data);
}

/**
 * 批量审核：review.apply + 批量校验 + 顺序逐条写。
 * 不使用 Promise.all 并发写（避免多表部分成功 / 无事务一致性的"假事务"）。
 * TODO: 三表审核为多栏位不同表写（review_status / url_status / risk），
 * 跨表无单事务 RPC；后续可在数据库层新增统一审核事务函数（或按内容来源
 * 建批量审核 RPC）保证整批原子性，届时替换此处顺序逐条写。
 */
export async function batchReviewItems(inputs: ReviewActionInput[]): Promise<void> {
  await requireReviewApply();
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new AuthError(AUTH_ERROR_CODES.VALIDATION_FAILED, '未选择任何内容');
  }

  const parsed = inputs.map((i) => reviewActionSchema.safeParse(i));
  const firstInvalid = parsed.find((p) => !p.success);
  if (firstInvalid && !firstInvalid.success) {
    throw new AuthError(
      AUTH_ERROR_CODES.VALIDATION_FAILED,
      firstInvalid.error.issues[0]?.message ?? '审核输入不合法',
    );
  }

  const data: ReviewActionInput[] = parsed
    .filter((p): p is { success: true; data: ReviewActionInput } => p.success)
    .map((p) => p.data);
  for (const item of data) {
    await applyReviewWrite(item);
  }
}