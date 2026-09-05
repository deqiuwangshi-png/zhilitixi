// 举报处理 Server Actions（'use server' 文件）
'use server';

import { revalidatePath } from 'next/cache';
import { AuthError } from '@/lib/auth/errors';
import { reportActionSchema, type ReportActionInput, applyReportAction } from '@/modules/report';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function toError(e: unknown): string {
  if (e instanceof AuthError) return e.message;
  return e instanceof Error ? e.message : String(e);
}

/** 处理举报（通过 / 驳回）：授权 + 写库逻辑委托模块命令层 */
export async function handleReport(input: ReportActionInput): Promise<ActionResult> {
  try {
    // zod 校验输入边界
    const parsed = reportActionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '输入不合法' };
    // 命中的命令内部按动作做细分授权并写 reports.status
    await applyReportAction(parsed.data.id, parsed.data.action);
    revalidatePath('/report');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}