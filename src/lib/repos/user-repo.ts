// 用户管理仓储层：唯一数据访问入口（用户列表 / 治理详情 / 治理操作落库 + 处罚流水）。
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { UsersRow } from '@/lib/db-types';

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
  const { data, error } = await getSupabaseClient()
    .from('users')
    .select(LIST_COLS)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`listUsers failed: ${error.message}`);
  return (data ?? []).map(mapRow);
}

/** 全量处罚流水，按 user_id 分组（一次查询，供列表详情抽屉；Record 便于 RSC 序列化） */
export async function listPenaltiesGrouped(): Promise<Record<string, PenaltyRecord[]>> {
  const client = getSupabaseClient();
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
  const { error } = await getSupabaseClient().from('governance_penalties').insert({
    user_id: userId,
    action,
    reason: reason || '',
    operator_id: operatorId,
  });
  if (error) throw new Error(`appendPenalty failed: ${error.message}`);
}

interface GovFields {
  anomaly: string | null;
  penalty_count: number | null;
  gov_status: string | null;
}

async function getRawGov(id: string): Promise<GovFields> {
  const { data, error } = await getSupabaseClient()
    .from('users')
    .select('anomaly,penalty_count,gov_status')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`getGov failed: ${error.message}`);
  return data ?? { anomaly: null, penalty_count: null, gov_status: null };
}

/** 治理动作（封禁/限流/恢复）：更新治理列 + 写流水 */
export async function applyGovAction(
  id: string,
  action: 'ban' | 'unban' | 'limit' | 'unlimit' | 'normal',
  reason: string,
  operatorId: string
): Promise<void> {
  const cur = await getRawGov(id);
  const now = new Date();
  const banUntil = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString();
  const limitUntil = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

type GovPatch = Partial<Pick<UsersRow, 'gov_status' | 'ban_until' | 'rate_limit_until' | 'anomaly' | 'penalty_count'>>;

  let patch: GovPatch = {};
  let penAction: PenaltyAction = 'unban';

  switch (action) {
    case 'ban':
      patch = {
        gov_status: 'banned',
        ban_until: banUntil,
        anomaly: cur.anomaly || '封禁标记',
        penalty_count: (cur.penalty_count ?? 0) + 1,
      };
      penAction = 'ban';
      break;
    case 'limit':
      patch = {
        gov_status: 'limited',
        rate_limit_until: limitUntil,
        anomaly: cur.anomaly || '限流标记',
        penalty_count: (cur.penalty_count ?? 0) + 1,
      };
      penAction = 'limit';
      break;
    case 'normal':
      patch = { gov_status: 'normal', ban_until: null, rate_limit_until: null, anomaly: '' };
      penAction = 'unban';
      break;
    case 'unban':
      patch = { gov_status: 'normal', ban_until: null };
      penAction = 'unban';
      break;
    case 'unlimit':
      patch = { gov_status: 'normal', rate_limit_until: null };
      penAction = 'unlimit';
      break;
  }

  const { error } = await getSupabaseClient().from('users').update(patch).eq('id', id);
  if (error) throw new Error(`applyGovAction failed: ${error.message}`);
  await appendPenalty(id, penAction, reason, operatorId);
}

/** 角色调整：更新治理列 + 写流水 */
export async function setUserRole(
  id: string,
  role: GovRole,
  reason: string,
  operatorId: string
): Promise<void> {
  const { error } = await getSupabaseClient().from('users').update({ gov_role: role }).eq('id', id);
  if (error) throw new Error(`setUserRole failed: ${error.message}`);
  await appendPenalty(id, 'role_change', reason || `角色调整为${role === 'moderator' ? '版主' : '普通用户'}`, operatorId);
}

/** 编辑基础资料（name/points/badge 写回主库） */
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

  const { error } = await getSupabaseClient().from('users').update(p).eq('id', id);
  if (error) throw new Error(`editUserProfile failed: ${error.message}`);
  await appendPenalty(id, 'edit', '编辑基础资料', operatorId);
}
