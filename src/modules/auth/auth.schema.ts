// 认证会话域：输入校验（zod，域内唯一定义处）。
// 登录（Server Action）+ 个人资料 / 改密（/api/auth/me 与 /api/auth/change-password body 边界）。
import { z } from 'zod';

/** 登录表单校验（不暴露 Supabase 原始错误，凭据错误统一映射） */
export const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少 6 位'),
});
export type LoginInput = z.infer<typeof loginSchema>;

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
