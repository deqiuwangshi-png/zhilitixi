// 用户治理模块：公共入口（显式导出白名单，页面/组件只从模块面取类型与读函数；
// 写操作经 actions.ts 唯一入口，commands 落库函数与 mapper 不对外导出）。
export type {
  GovStatus,
  GovRole,
  GovAction,
  PenaltyAction,
  PenaltyRecord,
  UserItem,
  UserPageParams,
  UserListQuery,
  UserPageResult,
  UserProfilePatch,
  UserRowData,
  VerificationStatus,
  VerificationItem,
  AuthData,
} from './users.types';

export {
  govActionSchema,
  editUserSchema,
  verificationActionSchema,
  userListQuerySchema,
  toUserListQuery,
  SIZES,
  DEFAULT_PAGE_SIZE,
  type GovActionInput,
  type EditUserInput,
  type VerificationActionInput,
  type UserSize,
  type UserListQueryInput,
} from './users.schema';

export { requireUserRead, requireUserEdit, requireUserBan } from './users.policy';
export { listUsers, listPenaltiesGrouped, listAuthData } from './users.queries';
