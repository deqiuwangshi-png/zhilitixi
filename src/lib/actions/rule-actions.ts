// 规则与处罚 Server Actions（'use server' 文件）
'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { applyRuleAction } from '@/lib/repos/rule-repo';
import { ruleActionSchema, type RuleActionInput } from '@/lib/validations/rule.schema';

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
    await requireAdmin();
    const parsed = ruleActionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '输入不合法' };
    await applyRuleAction(parsed.data);
    revalidatePath('/rules');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}
