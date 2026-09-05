// 认证/授权统一错误码与稳定错误结构。
// 对外只返回稳定 code + 友好 message，不向客户端暴露 Supabase 原始错误、SQL、表名或堆栈。
// 该模块为服务端专用（Server Action / Route Handler / policies），用 server-only 作编译期守卫。
import 'server-only';

export const AUTH_ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  AUTH_USER_NOT_FOUND: 'AUTH_USER_NOT_FOUND',
  PASSWORD_INVALID: 'PASSWORD_INVALID',
  PASSWORD_UPDATE_FAILED: 'PASSWORD_UPDATE_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

/** 对外的稳定错误结构（与 AUTH 计划阶段三一致） */
export interface ApiError {
  code: AuthErrorCode;
  message: string;
  requestId: string;
}

/** 认证 API 使用的稳定 HTTP 错误响应体 */
export interface ApiErrorBody {
  error: string; // 友好中文文案
  code: AuthErrorCode | null;
  requestId: string;
}

/**
 * 构建带稳定错误码 + requestId 的错误响应体。
 * - message 用默认文案（可覆盖），不包含底层异常细节。
 * - requestId 与 RequestId 运输保持一致；未提供时自动生成。
 */
export function createApiError(
  code: AuthErrorCode,
  requestId = '',
  message?: string,
): ApiErrorBody {
  return {
    error: message ?? defaultMessage(code),
    code,
    requestId: requestId || 'unknown',
  };
}

/** 生成一个可供日志、审计复用的简单 request id（短格式，适合多副本无碰撞即可） */
export function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultMessage(code: AuthErrorCode): string {
  switch (code) {
    case AUTH_ERROR_CODES.AUTH_REQUIRED:
      return '请先登录';
    case AUTH_ERROR_CODES.FORBIDDEN:
      return '无权执行此操作';
    case AUTH_ERROR_CODES.VALIDATION_FAILED:
      return '请求参数不合法';
    case AUTH_ERROR_CODES.AUTH_USER_NOT_FOUND:
      return '未找到该账户的认证信息';
    case AUTH_ERROR_CODES.PASSWORD_INVALID:
      return '当前密码不正确';
    case AUTH_ERROR_CODES.PASSWORD_UPDATE_FAILED:
      return '密码更新失败，请稍后重试';
    case AUTH_ERROR_CODES.INTERNAL_ERROR:
    default:
      return '服务暂时不可用，请稍后重试';
  }
}

/**
 * 认证/授权层抛出的业务异常。
 * 由调用方（Server Action / Route Handler / 页面）根据边界适配为响应或重定向。
 */
export class AuthError extends Error {
  readonly code: AuthErrorCode;
  /** 建议的 HTTP 状态码 */
  readonly status: number;

  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? defaultMessage(code));
    this.name = 'AuthError';
    this.code = code;
    this.status = statusForCode(code);
    // 修复 TS 目标库不原生支持 Error 子类时的原型链问题
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

function statusForCode(code: AuthErrorCode): number {
  switch (code) {
    case AUTH_ERROR_CODES.AUTH_REQUIRED:
      return 401;
    case AUTH_ERROR_CODES.FORBIDDEN:
      return 403;
    case AUTH_ERROR_CODES.VALIDATION_FAILED:
      return 422;
    case AUTH_ERROR_CODES.AUTH_USER_NOT_FOUND:
      return 404;
    case AUTH_ERROR_CODES.PASSWORD_INVALID:
      return 401;
    case AUTH_ERROR_CODES.PASSWORD_UPDATE_FAILED:
      return 500;
    case AUTH_ERROR_CODES.INTERNAL_ERROR:
    default:
      return 500;
  }
}