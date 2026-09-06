// 认证会话域：公共入口（显式导出白名单，供登录页 / dashboard-header / API route 使用）。
// 说明：auth 域无独立业务页面（登录页在 (auth)/login，会话挂在 dashboard 顶栏）。
export type {
  LoginState,
  AdminProfileUser,
  AdminSession,
  AdminProfileResult,
} from './auth.types';

export type { LoginInput, ChangePasswordInput, UpdateProfileInput } from './auth.schema';

export { requireAuthAccess } from './auth.policy';
export { getAdminProfileAndSessions } from './auth.queries';
export { updateAdminProfile, changeAdminPassword } from './auth.commands';
export { changePasswordSchema, updateProfileSchema } from './auth.schema';
