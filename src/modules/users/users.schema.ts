// 用户治理模块：输入校验（zod，域内唯一定义处）。
// 治理/编辑/认证审核写操作 schema + URL searchParams 列表校验。
import { z } from 'zod';
import type { UserListQuery } from './users.types';

/** 治理动作（ban/unban/limit/unlimit/normal）：user.ban + 事务 RPC 入参 */
export const govActionSchema = z.object({
  id: z.string().min(1, '缺少用户 id'),
  action: z.enum(['ban', 'unban', 'limit', 'unlimit', 'normal'], '无效的治理动作'),
  reason: z.string().max(200).optional().default(''),
});
export type GovActionInput = z.infer<typeof govActionSchema>;

/** 编辑基础资料（昵称/积分/徽章，可含角色调整）：user.edit + 事务 RPC 入参 */
export const editUserSchema = z.object({
  id: z.string().min(1, '缺少用户 id'),
  name: z.string().trim().min(1, '昵称不能为空').max(30, '昵称过长').optional(),
  points: z.number().int('积分为整数').min(-100000).max(100000).optional(),
  badge: z.string().max(30, '徽章过长').optional(),
  role: z.enum(['user', 'moderator']).optional(),
});
export type EditUserInput = z.infer<typeof editUserSchema>;

/** 认证审核动作（approve/reject）：写 verifications.status */
export const verificationActionSchema = z.object({
  id: z.string().min(1, '缺少申请 id'),
  action: z.enum(['approve', 'reject'], '无效的审核动作'),
});
export type VerificationActionInput = z.infer<typeof verificationActionSchema>;

/** 列表页 pageSize 白名单 */
export const SIZES = [10, 20, 50, 100] as const;
export type UserSize = (typeof SIZES)[number];

/** 分页默认 pageSize */
export const DEFAULT_PAGE_SIZE = 10;

/** 列表筛选中"全部"的 URL 占位值 */
export const STATUS_ALL = 'all';
export const ROLE_ALL = 'all';
export const ANOMALY_ALL = 'all';

/**
 * 用户列表 URL searchParams 校验。
 * 字段均为可选；page 默认 1 且最小 1，size 严格白名单 [10,20,50,100]。
 */
export const userListQuerySchema = z.object({
  status: z.string().optional(),
  role: z.string().optional(),
  anomaly: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  size: z.coerce
    .number()
    .int()
    .refine((n) => (SIZES as readonly number[]).includes(n), 'pageSize 不在允许范围')
    .optional(),
});

export type UserListQueryInput = z.infer<typeof userListQuerySchema>;

/** 把校验后的 URL 参数转换为查询条件（默认 page=1 / pageSize=10，占位值收敛为 undefined） */
export function toUserListQuery(input: UserListQueryInput): UserListQuery {
  return {
    page: input.page ?? 1,
    pageSize: input.size ?? DEFAULT_PAGE_SIZE,
    status: input.status && input.status !== STATUS_ALL ? input.status : undefined,
    role: input.role && input.role !== ROLE_ALL ? input.role : undefined,
    anomaly: input.anomaly && input.anomaly !== ANOMALY_ALL ? input.anomaly : undefined,
    q: input.q?.trim() || undefined,
  };
}