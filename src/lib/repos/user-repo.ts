// 用户管理仓储层：唯一数据访问入口（用户列表 / 治理详情 / 治理操作落库 + 处罚流水）。
// TODO: 业务逻辑已迁移至 src/modules/users（types/schema/policy/mapper/queries/commands），
// 本文件导出仍被 components/features/users/* 与 user-actions 历史引用，保留以兼容，勿删。
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import { getSessionRlsClient } from '@/lib/auth/session-client';
import type { UsersRow } from '@/lib/db-types';

/** 请求幂等键；未提供时为 null，由数据库 RPC 内部生成。 */
function toRpcRequestId(requestId?: string): string | null {
  return requestId && requestId.length > 0 ? requestId : null;
}

export type GovStatus = 'normal' | 'limited' | 'banned';
export type GovRole = 'user' | 'moderator';
export type PenaltyAction = 'ban' | 'limit' | 'unban' | 'unlimit' | 'role_change' | 'edit';

export interface PenaltyRecord {
  id: string;
  action: PenaltyAction;
  reason: string;
  operator: string; // 操作人姓名
  at: string; // ISO
}

export interface UserListItem {
  id: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  points: number;
  badge: string | null;
  createdAt: string | null;
  status: GovStatus;
  role: GovRole;
  anomaly: string;
  penaltyCount: number;
  banUntil: string;
  rateLimitUntil: string;
}

export interface UserDetail extends UserListItem {
  history: PenaltyRecord[];
}

const LIST_COLS =
  'id,name,bio,avatar_url,points,created_at,cover_url,badge,gov_status,gov_role,anomaly,penalty_count,ban_until,rate_limit_until';

/** listUsers 的 select 结果类型（LIST_COLS 未含 is_admin） */
type UserRowData = Omit<UsersRow, 'is_admin'>;

function mapRow(u: UserRowData): UserListItem {
  const hasBadge = !!u.badge && u.badge !== 'none' && u.badge !== '';
  return {
    id: u.id,
    name: u.name ?? '',
    bio: u.bio ?? null,
    avatarUrl: u.avatar_url ?? null,
    points: u.points ?? 0,
    badge: u.badge ?? null,
    createdAt: u.created_at ?? null,
    status: (u.gov_status as GovStatus) || 'normal',
    role: u.gov_role === 'moderator' || hasBadge ? 'moderator' : 'user',
    anomaly: u.anomaly ?? '',
    penaltyCount: u.penalty_count ?? 0,
    banUntil: u.ban_until ?? '',
    rateLimitUntil: u.rate_limit_until ?? '',
  };
}

/** 用户列表（含治理字段） */
export async function listUsers(): Promise<UserListItem[]> {
  const client = await getSessionRlsClient();
  const { data, error } = await client
    .from('users')
    .select(LIST_COLS)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`listUsers failed: ${error.message}`);
  return (data ?? []).map(mapRow);
}

/** 处罚流水，按 user_id 分组（供列表详情抽屉；Record 便于 RSC 序列化）。
 * TODO: 分页待下沉——目前固定 limit(500)，并非“全量”，仅覆盖列表查看的最近流水；
 * 后续治理处罚流水应支持数据库分页，替换此处有界拉取。modules/users 亦复用本实现。 */
export async function listPenaltiesGrouped(): Promise<Record<string, PenaltyRecord[]>> {
  const client = await getSessionRlsClient();
  const { data, error } = await client
    .from('governance_penalties')
    .select('id,user_id,action,reason,operator_id,created_at')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(`listPenalties failed: ${error.message}`);
  const rows = data ?? [];

  const operatorIds = Array.from(
    new Set(rows.map((p) => p.operator_id).filter((x): x is string => !!x))
  );
  const names: Record<string, string> = {};
  if (operatorIds.length) {
    const { data: ops } = await client.from('users').select('id,name').in('id', operatorIds);
    for (const o of ops ?? []) names[o.id] = o.name ?? '';
  }

  const map: Record<string, PenaltyRecord[]> = {};
  for (const p of rows) {
    const rec: PenaltyRecord = {
      id: p.id,
      action: p.action as PenaltyAction,
      reason: p.reason ?? '',
      operator: names[p.operator_id ?? ''] ?? '',
      at: p.created_at ?? '',
    };
    (map[p.user_id] ??= []).push(rec);
  }
  return map;
}

/** 追加处罚流水（可审计） */
async function appendPenalty(
  userId: string,
  action: PenaltyAction,
  reason: string,
  operatorId: string
): Promise<void> {
  const { error } = await getSupabasePrivilegedClient().from('governance_penalties').insert({
    user_id: userId,
    action,
    reason: reason || '',
    operator_id: operatorId,
  });
  if (error) throw new Error(`appendPenalty failed: ${error.message}`);
}

/** 调用事务 RPC：同一数据库事务内更新治理状态 + 处罚流水 + 审计日志 */
async function applyGovernanceActionViaRpc(
  id: string,
  action: 'ban' | 'unban' | 'limit' | 'unlimit' | 'normal',
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
  if (error) throw new Error(`apply_governance_action rpc failed: ${error.message}`);
}

/** 治理动作（封禁/限流/恢复）：更新治理列 + 处罚流水 + 审计，走事务 RPC（同成功/同失败） */
export async function applyGovAction(
  id: string,
  action: 'ban' | 'unban' | 'limit' | 'unlimit' | 'normal',
  reason: string,
  operatorId: string,
  requestId?: string
): Promise<void> {
  await applyGovernanceActionViaRpc(id, action, reason, operatorId, requestId);
}

/** 角色调整：更新治理列 + 写流水。
 * TODO: 已弃用（两步独立写，非单事务）——现由 edit_user_profile_and_role 事务 RPC 取代
 * （见 modules/users/users.commands.ts）。本导出仅保留以兼容历史引用，勿在新代码调用。 */
export async function setUserRole(
  id: string,
  role: GovRole,
  reason: string,
  operatorId: string
): Promise<void> {
  const { error } = await getSupabasePrivilegedClient().from('users').update({ gov_role: role }).eq('id', id);
  if (error) throw new Error(`setUserRole failed: ${error.message}`);
  await appendPenalty(id, 'role_change', reason || `角色调整为${role === 'moderator' ? '版主' : '普通用户'}`, operatorId);
}

/** 编辑基础资料（name/points/badge 写回主库）。
 * TODO: 已弃用（两步独立写，非单事务）——现由 edit_user_profile_and_role 事务 RPC 取代
 * （见 modules/users/users.commands.ts）。本导出仅保留以兼容历史引用，勿在新代码调用。 */
export async function editUserProfile(
  id: string,
  patch: { name?: string; points?: number; badge?: string },
  operatorId: string
): Promise<void> {
  const p: Partial<Pick<UsersRow, 'name' | 'points' | 'badge'>> = {};
  if (typeof patch.name === 'string' && patch.name.trim()) p.name = patch.name.trim();
  if (typeof patch.points === 'number') p.points = patch.points;
  if (typeof patch.badge === 'string') p.badge = patch.badge;
  if (Object.keys(p).length === 0) return;

  const { error } = await getSupabasePrivilegedClient().from('users').update(p).eq('id', id);
  if (error) throw new Error(`editUserProfile failed: ${error.message}`);
  await appendPenalty(id, 'edit', '编辑基础资料', operatorId);
}
