// errors.ts / http.ts 单测：稳定错误结构、错误码→HTTP 状态映射、toErrorResponse 收敛。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_ERROR_CODES,
  AuthError,
  createApiError,
  defaultMessage,
  generateRequestId,
} from '@/lib/auth/errors';
import { toErrorResponse } from '@/lib/auth/http';
import { getRequestId, withRequestId } from '@/lib/request-context';

const mocks = vi.hoisted(() => ({
  nextJson: vi.fn(),
}));

vi.mock('next/server', () => ({
  NextResponse: { json: mocks.nextJson },
}));

describe('createApiError（稳定错误结构）', () => {
  it('默认文案 + 自动 requestId 占位', () => {
    expect(createApiError(AUTH_ERROR_CODES.AUTH_REQUIRED)).toEqual({
      error: '请先登录',
      code: 'AUTH_REQUIRED',
      requestId: 'unknown',
    });
  });

  it('传入 requestId 与自定义 message 时原样保留', () => {
    expect(
      createApiError(AUTH_ERROR_CODES.FORBIDDEN, 'req-123', '自定义文案'),
    ).toEqual({
      error: '自定义文案',
      code: 'FORBIDDEN',
      requestId: 'req-123',
    });
  });

  it('requestId 为空串时回落为 unknown', () => {
    expect(createApiError(AUTH_ERROR_CODES.INTERNAL_ERROR, '').requestId).toBe('unknown');
  });
});

describe('defaultMessage（错误码→默认文案）', () => {
  it('每个错误码都有稳定的默认文案', () => {
    expect(defaultMessage(AUTH_ERROR_CODES.AUTH_REQUIRED)).toBe('请先登录');
    expect(defaultMessage(AUTH_ERROR_CODES.FORBIDDEN)).toBe('无权执行此操作');
    expect(defaultMessage(AUTH_ERROR_CODES.VALIDATION_FAILED)).toBe('请求参数不合法');
    expect(defaultMessage(AUTH_ERROR_CODES.AUTH_USER_NOT_FOUND)).toBe('未找到该账户的认证信息');
    expect(defaultMessage(AUTH_ERROR_CODES.PASSWORD_INVALID)).toBe('当前密码不正确');
    expect(defaultMessage(AUTH_ERROR_CODES.PASSWORD_UPDATE_FAILED)).toBe('密码更新失败，请稍后重试');
    expect(defaultMessage(AUTH_ERROR_CODES.INTERNAL_ERROR)).toBe('服务暂时不可用，请稍后重试');
  });

  it('未知 code（类型外）回落 INTERNAL_ERROR 文案', () => {
    expect(defaultMessage('NOT_A_REAL_CODE' as (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES])).toBe(
      '服务暂时不可用，请稍后重试',
    );
  });
});

describe('AuthError（错误码 + HTTP 状态映射）', () => {
  it('instanceof Error 且携带稳定 code 与中文 message', () => {
    const err = new AuthError(AUTH_ERROR_CODES.FORBIDDEN);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AuthError);
    expect(err.name).toBe('AuthError');
    expect(err.code).toBe('FORBIDDEN');
    expect(err.message).toBe('无权执行此操作');
  });

  it('自定义 message 覆盖默认文案', () => {
    const err = new AuthError(AUTH_ERROR_CODES.FORBIDDEN, '专属提示');
    expect(err.message).toBe('专属提示');
  });

  it('错误码→HTTP 状态映射', () => {
    expect(new AuthError(AUTH_ERROR_CODES.AUTH_REQUIRED).status).toBe(401);
    expect(new AuthError(AUTH_ERROR_CODES.FORBIDDEN).status).toBe(403);
    expect(new AuthError(AUTH_ERROR_CODES.VALIDATION_FAILED).status).toBe(422);
    expect(new AuthError(AUTH_ERROR_CODES.AUTH_USER_NOT_FOUND).status).toBe(404);
    expect(new AuthError(AUTH_ERROR_CODES.PASSWORD_INVALID).status).toBe(401);
    expect(new AuthError(AUTH_ERROR_CODES.PASSWORD_UPDATE_FAILED).status).toBe(500);
    expect(new AuthError(AUTH_ERROR_CODES.INTERNAL_ERROR).status).toBe(500);
  });
});

describe('generateRequestId', () => {
  it('格式为短横线分隔的 base36 片段', () => {
    expect(generateRequestId()).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
  });

  it('连续调用不重复', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateRequestId()));
    expect(ids.size).toBe(100);
  });
});

describe('toErrorResponse（Route Handler 错误收敛）', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mocks.nextJson.mockReset();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('AuthError → 对应 code 与 status（回显入口统一 requestId）', async () => {
    await withRequestId(async (requestId) => {
      toErrorResponse(new AuthError(AUTH_ERROR_CODES.AUTH_REQUIRED));
      expect(mocks.nextJson).toHaveBeenCalledTimes(1);
      const [body, init] = mocks.nextJson.mock.calls[0] as [
        { error: string; code: string; requestId: string },
        { status: number },
      ];
      expect(body.code).toBe('AUTH_REQUIRED');
      expect(body.error).toBe('请先登录');
      // 全链路同一 id：错误响应回显入口 withRequestId 生成的 requestId
      expect(body.requestId).toBe(requestId);
      expect(init.status).toBe(401);
    });
  });

  it('非 AuthError → INTERNAL_ERROR + 500，不泄露底层细节', async () => {
    await withRequestId(async (requestId) => {
      toErrorResponse(new Error('secret db password leaked'));
      expect(mocks.nextJson).toHaveBeenCalledTimes(1);
      const [body, init] = mocks.nextJson.mock.calls[0] as [
        { error: string; code: string; requestId: string },
        { status: number },
      ];
      expect(body.code).toBe('INTERNAL_ERROR');
      expect(body.error).toBe('服务暂时不可用，请稍后重试');
      expect(init.status).toBe(500);
      expect(JSON.stringify(body)).not.toContain('secret');
      expect(body.requestId).toBe(requestId);
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  it('未包裹 withRequestId 时回落 unknown（不崩溃）', () => {
    toErrorResponse(new Error('x'));
    const [body] = mocks.nextJson.mock.calls[0] as [{ requestId: string }];
    expect(body.requestId).toBe('unknown');
    expect(getRequestId()).toBeNull();
  });
});
