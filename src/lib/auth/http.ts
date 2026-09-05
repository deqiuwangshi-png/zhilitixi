// 认证 Route Handler 的错误响应映射助手。
// 只用于认证接口；将 AuthError 映射为稳定错误体，其余异常一律视为内部错误，不泄露细节。
// requestId 优先取入口统一生成的值（见 request-context），保证同一次请求全链路同一 id。
import 'server-only';
import { NextResponse } from 'next/server';
import { AuthError, AUTH_ERROR_CODES, createApiError } from '@/lib/auth/errors';
import { getRequestId } from '@/lib/request-context';

/** 把任意异常转为稳定的 JSON 错误响应（AuthError → 对应 code/status，其他 → INTERNAL_ERROR）。 */
export function toErrorResponse(error: unknown): NextResponse {
  const requestId = getRequestId() ?? 'unknown';
  if (error instanceof AuthError) {
    return NextResponse.json(createApiError(error.code, requestId, error.message), {
      status: error.status,
    });
  }
  // 非 AuthError：内部错误，记录以便排查，不对外输出
  console.error(`[auth/route] unexpected error (requestId=${requestId}):`, error);
  return NextResponse.json(createApiError(AUTH_ERROR_CODES.INTERNAL_ERROR, requestId), {
    status: 500,
  });
}