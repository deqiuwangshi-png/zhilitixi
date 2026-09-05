// 举报处理 Server Actions（'use server' 文件）
'use server';

import { revalidatePath } from 'next/cache';
import { AuthError } from '@/lib/auth/errors';
import { withRequestId } from '@/lib/request-context';
import { reportActionSchema, type ReportActionInput, applyReportAction } from '@/modules/report';

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** 入口统一生成的请求 id：失败时供客户端上报排查，与审计日志对齐 */
  requestId?: string;
}

function toError(e: unknown): string {
  if (e instanceof AuthError) return e.message;
  return e instanceof Error ? e.message : String(e);
}

/** 处理举报（通过 / 驳回）：授权 + 写库逻辑委托模块命令层 */
export async function handleReport(input: ReportActionInput): Promise<ActionResult> {
  return withRequestId(async (requestId) => {
    try {
      // zod 校验输入边界
      const parsed = reportActionSchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? '输入不合法', requestId };
      // 命中的命令内部按动作做细分授权并写 reports.status
      await applyReportAction(parsed.data.id, parsed.data.action);
      revalidatePath('/report');
      return { ok: true, requestId };
    } catch (e) {
      return { ok: false, error: toError(e), requestId };
    }
  });
}