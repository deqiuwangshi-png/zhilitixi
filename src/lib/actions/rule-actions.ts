// 规则与处罚 Server Actions（'use server' 文件）
'use server';

import { revalidatePath } from 'next/cache';
import { applyRule, type RuleActionInput } from '@/modules/rules';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function toError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 域名规则操作（加名单 / 切换 / 删除） */
export async function handleRuleAction(input: RuleActionInput): Promise<ActionResult> {
  try {
    await applyRule(input);
    revalidatePath('/rules');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}
