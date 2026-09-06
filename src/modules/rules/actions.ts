// 规则与处罚模块：Server Actions（唯一写入口）。
// 注意：'use server' 文件只能导出 async 函数，类型定义必须放在 rules.types / rules.schema。
'use server';

import { revalidatePath } from 'next/cache';
import { withRequestId } from '@/lib/request-context';
import { applyRule } from './rules.commands';
import type { RuleActionInput } from './rules.schema';

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** 入口统一生成的请求 id：失败时供客户端上报排查，与审计日志对齐 */
  requestId?: string;
}

function toError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 域名规则操作（加名单 / 切换 / 删除） */
export async function handleRuleAction(input: RuleActionInput): Promise<ActionResult> {
  return withRequestId(async (requestId) => {
    try {
      await applyRule(input);
      revalidatePath('/rules');
      return { ok: true, requestId };
    } catch (e) {
      return { ok: false, error: toError(e), requestId };
    }
  });
}
