// 认证接口输入校验（zod，/api/auth/me 与 /api/auth/change-password 的 body 边界）
import { z } from 'zod';

/** 修改密码 body 校验 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '请填写当前密码'),
  newPassword: z.string().min(6, '新密码长度至少 6 位'),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** 编辑资料 body 校验（全部可选，至少提供一项） */
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, '用户名不能为空').max(50, '用户名过长').optional(),
  bio: z.string().optional(),
  badge: z.string().min(1).max(50).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;