// 用户治理模块：命令层（写操作）。
// 授权 → zod 校验 → 落库，失败抛稳定 AuthError（不暴露 Supabase 原始错误）。
// 治理动作走 apply_governance_action 事务 RPC（更新治理列 + 处罚流水 + 审计日志）。
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
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
  const { error } = await getSupabasePrivilegedClient().rpc('apply_governance_action', {
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

/** 事务 RPC：同一数据库事务内原子写 资料列 + 角色 + 处罚流水 + 审计日志 */
async function editUserProfileAndRoleViaRpc(
  id: string,
  patch: { name?: string; points?: number; badge?: string },
  role: 'user' | 'moderator' | null | undefined,
  operatorId: string,
  requestId?: string
): Promise<void> {
  const { error } = await getSupabasePrivilegedClient().rpc('edit_user_profile_and_role', {
    p_user_id: id,
    p_role: role ?? null,
    p_name: patch.name ?? null,
    p_points: patch.points ?? null,
    p_badge: patch.badge ?? null,
    p_operator_id: operatorId,
    p_request_id: toRpcRequestId(requestId),
  });
  if (error) {
    // 稳定文案对外；原始错误只落日志
    console.error('[users] edit_user_profile_and_role failed:', error.message);
    throw new AuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, '编辑资料失败，请稍后重试');
  }
}

/** 角色调整：user.edit + 校验 + 事务 RPC（单事务原子写角色） */
export async function updateUserRole(input: { id: string; role: 'user' | 'moderator' }): Promise<void> {
  const ctx = await requireUserEdit();
  const parsed = editUserSchema.pick({ id: true, role: true }).safeParse(input);
  if (!parsed.success || !parsed.data.role) {
    throw new AuthError(AUTH_ERROR_CODES.VALIDATION_FAILED, '无效的输入');
  }
  await editUserProfileAndRoleViaRpc(parsed.data.id, {}, parsed.data.role, ctx.userId);
}

/** 编辑基础资料（昵称/积分/徽章，可含角色调整）：user.edit + 校验 + 事务 RPC（单事务原子写） */
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
  // 原子化：资料列（name/points/badge）+ 可选角色调整在同一个 edit_user_profile_and_role
  // 事务 RPC 内完成，同成功/同失败，彻底消除“资料已改、角色未改”的部分成功。
  await editUserProfileAndRoleViaRpc(id, patch, role, ctx.userId);
}