// 风控中心模块：Server Actions（唯一写入口）。
// 注意：'use server' 文件只能导出 async 函数，类型定义必须放在 risk.types / risk.schema。
'use server';

import { revalidatePath } from 'next/cache';
import { withRequestId } from '@/lib/request-context';
import { applyRisk } from './risk.commands';
import type { RiskActionInput } from './risk.schema';

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** 入口统一生成的请求 id：失败时供客户端上报排查，与审计日志对齐 */
  requestId?: string;
}

function toError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 风控操作（域名增删/切换、URL 放行封禁删除、上传审核） */
export async function handleRiskAction(input: RiskActionInput): Promise<ActionResult> {
  return withRequestId(async (requestId) => {
    try {
      await applyRisk(input);
      revalidatePath('/risk-control');
      return { ok: true, requestId };
    } catch (e) {
      return { ok: false, error: toError(e), requestId };
    }
  });
}
