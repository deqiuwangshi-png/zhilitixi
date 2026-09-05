// 用户管理 Server Actions：治理操作统一入口（'use server' 文件）
'use server';

import { revalidatePath } from 'next/cache';
import { updateUserStatus, updateUserRole, updateUserProfile } from '@/modules/users';
import { withRequestId } from '@/lib/request-context';
import type { GovActionInput, EditUserInput } from '@/modules/users';

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** 入口统一生成的请求 id：失败时供客户端上报排查，与审计日志对齐 */
  requestId?: string;
}

function toError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 封禁 / 限流 / 恢复（客户端直接调用） */
export async function changeUserStatus(input: GovActionInput): Promise<ActionResult> {
  return withRequestId(async (requestId) => {
    try {
      await updateUserStatus(input);
      revalidatePath('/user-management');
      return { ok: true, requestId };
    } catch (e) {
      return { ok: false, error: toError(e), requestId };
    }
  });
}

/** 角色调整 */
export async function changeUserRole(input: { id: string; role: 'user' | 'moderator' }): Promise<ActionResult> {
  return withRequestId(async (requestId) => {
    try {
      await updateUserRole(input);
      revalidatePath('/user-management');
      return { ok: true, requestId };
    } catch (e) {
      return { ok: false, error: toError(e), requestId };
    }
  });
}

/** 编辑基础资料（昵称/积分/徽章） */
export async function editUser(input: EditUserInput): Promise<ActionResult> {
  return withRequestId(async (requestId) => {
    try {
      await updateUserProfile(input);
      revalidatePath('/user-management');
      return { ok: true, requestId };
    } catch (e) {
      return { ok: false, error: toError(e), requestId };
    }
  });
}
