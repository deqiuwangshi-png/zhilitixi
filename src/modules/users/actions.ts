// 用户治理模块：Server Actions（唯一写入口）。
// 注意：'use server' 文件只能导出 async 函数，类型定义必须放在 users.types / users.schema。
'use server';

import { revalidatePath } from 'next/cache';
import { withRequestId } from '@/lib/request-context';
import { updateUserStatus, updateUserRole, updateUserProfile, applyVerification } from './users.commands';
import type { EditUserInput, GovActionInput, VerificationActionInput } from './users.schema';

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** 入口统一生成的请求 id：失败时供客户端上报排查，与审计日志对齐 */
  requestId?: string;
}

function toError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 封禁 / 限流 / 恢复（user-management 客户端直接调用） */
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

/** 审核认证申请（通过 / 驳回；/user-auth 客户端直接调用） */
export async function handleVerification(input: VerificationActionInput): Promise<ActionResult> {
  return withRequestId(async (requestId) => {
    try {
      await applyVerification(input.id, input.action);
      revalidatePath('/user-auth');
      return { ok: true, requestId };
    } catch (e) {
      return { ok: false, error: toError(e), requestId };
    }
  });
}
