// 活动上架 Server Actions（'use server' 文件）
'use server';

import { revalidatePath } from 'next/cache';
import { withRequestId } from '@/lib/request-context';
import { saveActivity, toggleActivity, removeActivity, type ActivitySaveInput } from '@/modules/activity';

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** 入口统一生成的请求 id：失败时供客户端上报排查，与审计日志对齐 */
  requestId?: string;
}

function toError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 新增 / 更新活动 */
export async function saveActivityAction(input: ActivitySaveInput): Promise<ActionResult> {
  return withRequestId(async (requestId) => {
    try {
      await saveActivity(input);
      revalidatePath('/activity');
      return { ok: true, requestId };
    } catch (e) {
      return { ok: false, error: toError(e), requestId };
    }
  });
}

/** 上架 / 下架 */
export async function toggleActivityAction(input: { id: string; active: boolean }): Promise<ActionResult> {
  return withRequestId(async (requestId) => {
    try {
      await toggleActivity(input);
      revalidatePath('/activity');
      return { ok: true, requestId };
    } catch (e) {
      return { ok: false, error: toError(e), requestId };
    }
  });
}

/** 删除活动 */
export async function removeActivityAction(input: { id: string }): Promise<ActionResult> {
  return withRequestId(async (requestId) => {
    try {
      await removeActivity(input);
      revalidatePath('/activity');
      return { ok: true, requestId };
    } catch (e) {
      return { ok: false, error: toError(e), requestId };
    }
  });
}