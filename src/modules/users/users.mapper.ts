// 用户治理模块：行归一化映射（从旧 user-repo 迁移，字段与 UserItem 完全一致）。
import type { GovRole, GovStatus, UserItem, UserRowData } from './users.types';

/**
 * 单个裸行 → UserItem DTO。
 * 与旧 user-repo.mapRow 逻辑一致：status 取 gov_status，role 受 badge 影响。
 */
export function rowToDto(u: UserRowData): UserItem {
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
    role: u.gov_role === 'moderator' || hasBadge ? ('moderator' as GovRole) : 'user',
    anomaly: u.anomaly ?? '',
    penaltyCount: u.penalty_count ?? 0,
    banUntil: u.ban_until ?? '',
    rateLimitUntil: u.rate_limit_until ?? '',
  };
}