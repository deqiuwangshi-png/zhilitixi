// 侵权与申诉 Server Actions（'use server' 文件）
'use server';

import { revalidatePath } from 'next/cache';
import { withRequestId } from '@/lib/request-context';
import { applyAppeal, type AppealActionInput } from '@/modules/appeal';

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** 入口统一生成的请求 id：失败时供客户端上报排查，与审计日志对齐 */
  requestId?: string;
}

function toError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 申诉处理（恢复发布 / 维持处罚） */
export async function handleAppeal(input: AppealActionInput): Promise<ActionResult> {
  return withRequestId(async (requestId) => {
    try {
      await applyAppeal(input);
      revalidatePath('/infringement');
      return { ok: true, requestId };
    } catch (e) {
      return { ok: false, error: toError(e), requestId };
    }
  });
}
