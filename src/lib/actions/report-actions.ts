// 举报处理 Server Actions（'use server' 文件）
'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { applyReportAction } from '@/lib/repos/report-repo';
import { reportActionSchema, type ReportActionInput } from '@/lib/validations/report.schema';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function toError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 处理举报（通过 / 驳回） */
export async function handleReport(input: ReportActionInput): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = reportActionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '输入不合法' };
    await applyReportAction(parsed.data.id, parsed.data.action);
    revalidatePath('/report');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toError(e) };
  }
}
