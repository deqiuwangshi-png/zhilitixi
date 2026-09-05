// 用户管理 Server Actions：治理操作统一入口（'use server' 文件）
'use server';

import { revalidatePath } from 'next/cache';
import { updateUserStatus, updateUserRole, updateUserProfile } from '@/modules/users';
import type { GovActionInput, EditUserInput } from '@/modules/users';

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
    await updateUserStatus(input);
    revalidatePath('/user-management');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}

/** 角色调整 */
export async function changeUserRole(input: { id: string; role: 'user' | 'moderator' }): Promise<ActionResult> {
  try {
    await updateUserRole(input);
    revalidatePath('/user-management');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}

/** 编辑基础资料（昵称/积分/徽章） */
export async function editUser(input: EditUserInput): Promise<ActionResult> {
  try {
    await updateUserProfile(input);
    revalidatePath('/user-management');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}