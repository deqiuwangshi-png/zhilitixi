// 风控中心 Server Actions（'use server' 文件）
'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { applyRiskAction } from '@/lib/repos/risk-repo';
import { riskActionSchema, type RiskActionInput } from '@/lib/validations/risk.schema';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function toError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 风控操作（域名增删/切换、URL 放行封禁删除、上传审核） */
export async function handleRiskAction(input: RiskActionInput): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = riskActionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '输入不合法' };
    await applyRiskAction(parsed.data);
    revalidatePath('/risk-control');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}
