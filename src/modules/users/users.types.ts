// 用户治理模块：领域类型定义。
// 字段与前端 UserManagementClient / 各抽屉 / AuthClient / AuthStats 期望完全一致。
import type { UsersRow } from '@/lib/db-types';

/** 治理状态（数据库多态状态收敛） */
export type GovStatus = 'normal' | 'limited' | 'banned';

/** 角色类型 */
export type GovRole = 'user' | 'moderator';

/** 治理动作（写操作入参，走 apply_governance_action 事务 RPC） */
export type GovAction = 'ban' | 'unban' | 'limit' | 'unlimit' | 'normal';

/** 处罚流水动作（governance_penalties.action 的取值） */
export type PenaltyAction = 'ban' | 'limit' | 'unban' | 'unlimit' | 'role_change' | 'edit' | 'restore';

/** 处罚流水记录 DTO */
export interface PenaltyRecord {
  id: string;
  action: PenaltyAction;
  reason: string;
  operator: string; // 操作人姓名
  at: string; // ISO
}

/** 用户列表行 DTO */
export interface UserItem {
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

/** listUsers 所选列对应的裸行（LIST_COLS 未含 is_admin） */
export type UserRowData = Pick<
  UsersRow,
  | 'id'
  | 'name'
  | 'bio'
  | 'avatar_url'
  | 'points'
  | 'created_at'
  | 'cover_url'
  | 'badge'
  | 'gov_status'
  | 'gov_role'
  | 'anomaly'
  | 'penalty_count'
  | 'ban_until'
  | 'rate_limit_until'
>;

/** 用户列表筛选 + 分页查询条件（服务端构造，数据库分页筛选） */
export interface UserListQuery {
  page: number;
  pageSize: number;
  status?: string;
  role?: string;
  anomaly?: string;
  q?: string;
}

/** 分页结果通用结构 */
export interface UserPageResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 编辑基础资料的可写字段（name/points/badge 写回主库） */
export interface UserProfilePatch {
  name?: string;
  points?: number;
  badge?: string;
}

/** 用户管理页 URL searchParams（页面 + UserFilters 共享的筛选/分页参数） */
export interface UserPageParams {
  status?: string;
  role?: string;
  anomaly?: string;
  q?: string;
  page?: string;
  size?: string;
}

// ---------- 认证申请审核（/user-auth，本域子业务） ----------

/** 认证申请状态（verifications.status） */
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

/** 认证申请列表行 DTO（/user-auth 消费） */
export interface VerificationItem {
  id: string;
  userId: string | null;
  vtype: string | null;
  statement: string | null;
  status: VerificationStatus;
  createdAt: string | null;
  userName: string;
}

/** 认证审核页聚合数据（统计全量走数据库 count，列表有界预览） */
export interface AuthData {
  verifications: VerificationItem[];
  totalVerifications: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalUsers: number;
}