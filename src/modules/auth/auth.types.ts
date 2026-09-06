// 认证会话域：领域类型定义。
// 管理员登录 / 登出 / 个人资料 / 会话管理（后台自身身份体系，横切全局，无独立业务页面）。
import type { UsersRow } from '@/lib/db-types';
import type { AuthErrorCode } from '@/lib/auth/errors';

/** 登录表单状态（登录页 useActionState 的返回） */
export interface LoginState {
  error: string;
  code: AuthErrorCode | null;
}

/** 当前管理员聚合资料（/api/auth/me 的 user 段） */
export interface AdminProfileUser {
  id: string;
  name: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  points: number;
  badge: string;
  createdAt: string | null;
  email: string;
  phone: string;
  provider: string;
  emailConfirmed: boolean;
}

/** 当前管理员活跃会话（/api/auth/me 的 sessions 段） */
export interface AdminSession {
  id: string;
  userAgent: string;
  createdAt: string;
  updatedAt: string;
}

/** /api/auth/me 聚合返回 */
export interface AdminProfileResult {
  user: AdminProfileUser;
  sessions: AdminSession[];
}

/** 资料编辑可写字段（主库 users 表 + auth user_metadata 同步） */
export type ProfilePatch = Pick<UsersRow, 'name' | 'bio' | 'badge'>;
