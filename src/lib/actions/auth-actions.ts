// 用户认证 Server Actions（'use server' 文件）
'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { withRequestId } from '@/lib/request-context';
import { applyVerification } from '@/lib/repos/auth-repo';
import { verificationActionSchema, type VerificationActionInput } from '@/lib/validations/verification.schema';

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** 入口统一生成的请求 id：失败时供客户端上报排查，与审计日志对齐 */
  requestId?: string;
}

function toError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 审核认证申请（通过 / 驳回） */
export async function handleVerification(input: VerificationActionInput): Promise<ActionResult> {
  return withRequestId(async (requestId) => {
    try {
      await requireAdmin();
      const parsed = verificationActionSchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '输入不合法', requestId };
      await applyVerification(parsed.data.id, parsed.data.action);
      revalidatePath('/user-auth');
      return { ok: true, requestId };
    } catch (e) {
      return { ok: false, error: toError(e), requestId };
    }
  });
}
