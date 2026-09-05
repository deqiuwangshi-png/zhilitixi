// 用户治理模块：命令层（写操作）。
// 授权 → zod 校验 → 落库，失败抛稳定 AuthError（不暴露 Supabase 原始错误）。
// 治理动作走 apply_governance_action 事务 RPC（更新治理列 + 处罚流水 + 审计日志）。
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
import { setUserRole as repoSetUserRole, editUserProfile as repoEditUserProfile } from '@/lib/repos/user-repo';
import { requireUserBan, requireUserEdit } from './users.policy';
import { editUserSchema, govActionSchema, type EditUserInput, type GovActionInput } from './users.schema';

/** 请求幂等键；未提供时为 null，由数据库 RPC 内部生成。 */
function toRpcRequestId(requestId?: string): string | null {
  return requestId && requestId.length > 0 ? requestId : null;
}

/** 事务 RPC：同一数据库事务内更新治理状态 + 处罚流水 + 审计日志 */
async function applyGovernanceActionViaRpc(
  id: string,
  action: GovActionInput['action'],
  reason: string,
  operatorId: string,
  requestId?: string
): Promise<void> {
  const { error } = await getSupabaseClient().rpc('apply_governance_action', {
    p_user_id: id,
    p_action: action,
    p_reason: reason,
    p_operator_id: operatorId,
    p_request_id: toRpcRequestId(requestId),
  });
  if (error) {
    // 稳定文案对外；原始错误只落日志
    console.error('[users] apply_governance_action failed:', error.message);
    throw new AuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, '治理操作失败，请稍后重试');
  }
}

/** 治理动作（ban/unban/limit/unlimit/normal）：user.ban + 校验 + 事务 RPC */
export async function updateUserStatus(input: GovActionInput): Promise<void> {
  const ctx = await requireUserBan();
  const parsed = govActionSchema.safeParse(input);
  if (!parsed.success) {
    throw new AuthError(
      AUTH_ERROR_CODES.VALIDATION_FAILED,
      parsed.error.issues[0]?.message ?? '治理操作输入不合法'
    );
  }
  await applyGovernanceActionViaRpc(parsed.data.id, parsed.data.action, parsed.data.reason, ctx.userId);
}

/** 角色调整：user.edit + 校验 + 既有两步骤写（update + appendPenalty） */
export async function updateUserRole(input: { id: string; role: 'user' | 'moderator' }): Promise<void> {
  const ctx = await requireUserEdit();
  const parsed = editUserSchema.pick({ id: true, role: true }).safeParse(input);
  if (!parsed.success || !parsed.data.role) {
    throw new AuthError(AUTH_ERROR_CODES.VALIDATION_FAILED, '无效的输入');
  }
  await repoSetUserRole(parsed.data.id, parsed.data.role, '', ctx.userId);
}

/** 编辑基础资料（昵称/积分/徽章/角色）：user.edit + 校验 + 复用既有仓库逻辑 */
export async function updateUserProfile(input: EditUserInput): Promise<void> {
  const ctx = await requireUserEdit();
  const parsed = editUserSchema.safeParse(input);
  if (!parsed.success) {
    throw new AuthError(
      AUTH_ERROR_CODES.VALIDATION_FAILED,
      parsed.error.issues[0]?.message ?? '编辑资料输入不合法'
    );
  }
  const { id, role, ...patch } = parsed.data;
  // 现状：profile/role 仍为「update + appendPenalty」两步骤写（user-repo），非单事务。
  // 已缓解：保持顺序写，并对第二步（角色调整）用 try/catch 兜底——若第一步资料已写回、
  // 第二步角色失败，则抛出明确的稳定错误态（“资料已更新但角色未生效”），不让调用方
  // 误以为全部成功；同时原始错误仅落日志。为彻底原子性后续可收拢进事务 RPC，本次不
  // 强行造 RPC（避免过度工程）。
  if (Object.keys(patch).length > 0) {
    await repoEditUserProfile(id, patch, ctx.userId);
  }
  if (role) {
    try {
      await repoSetUserRole(id, role, '资料编辑调整角色', ctx.userId);
    } catch (err) {
      console.error('[users] updateUserProfile role step failed:', err instanceof Error ? err.message : err);
      throw new AuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, '资料已更新，但角色调整失败，请稍后重试');
    }
  }
}