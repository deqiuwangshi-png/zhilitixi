// 风控中心 Server Actions（'use server' 文件）
'use server';

import { revalidatePath } from 'next/cache';
import { applyRisk, type RiskActionInput } from '@/modules/risk';

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
    await applyRisk(input);
    revalidatePath('/risk-control');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}
