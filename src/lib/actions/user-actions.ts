// 用户管理 Server Actions：治理操作统一入口（'use server' 文件）
'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { applyGovAction, setUserRole, editUserProfile } from '@/lib/repos/user-repo';
import { govActionSchema, editUserSchema, type GovActionInput, type EditUserInput } from '@/lib/validations/user.schema';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function toError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 封禁 / 限流 / 恢复（客户端直接调用） */
export async function changeUserStatus(input: GovActionInput): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = govActionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '输入不合法' };
    await applyGovAction(parsed.data.id, parsed.data.action, parsed.data.reason, admin.userId);
    revalidatePath('/user-management');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}

/** 角色调整 */
export async function changeUserRole(input: { id: string; role: 'user' | 'moderator' }): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = editUserSchema.pick({ id: true, role: true }).safeParse(input);
    if (!parsed.success || !parsed.data.role) {
      return { ok: false, error: '无效的输入' };
    }
    await setUserRole(parsed.data.id, parsed.data.role, '', admin.userId);
    revalidatePath('/user-management');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}

/** 编辑基础资料（昵称/积分/徽章） */
export async function editUser(input: EditUserInput): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = editUserSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '输入不合法' };
    const { id, role, ...patch } = parsed.data;
    if (Object.keys(patch).length > 0) {
      await editUserProfile(id, patch, admin.userId);
    }
    if (role) {
      await setUserRole(id, role, '资料编辑调整角色', admin.userId);
    }
    revalidatePath('/user-management');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}
