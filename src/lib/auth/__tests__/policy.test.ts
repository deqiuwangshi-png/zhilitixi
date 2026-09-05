// policy.ts 单测：can / requirePermission 在未登录、无权限、有权限、空权限集时的行为。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthContext } from '@/lib/auth/context';
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
import { Permissions, type Permission } from '@/lib/auth/permissions';
import { can, requirePermission } from '@/lib/auth/policy';

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn<() => Promise<AuthContext | null>>(),
}));

vi.mock('@/lib/auth/context', () => ({
  getAuthContext: mocks.getAuthContext,
}));

function makeCtx(permissions: readonly Permission[]): AuthContext {
  return { userId: 'user-1', name: '管理员', role: 'admin', permissions };
}

describe('can（纯权限判断）', () => {
  beforeEach(() => {
    mocks.getAuthContext.mockReset();
  });

  it('未登录（上下文为 null）→ false', async () => {
    mocks.getAuthContext.mockResolvedValue(null);
    await expect(can(Permissions.userBan)).resolves.toBe(false);
  });

  it('无对应权限 → false', async () => {
    mocks.getAuthContext.mockResolvedValue(makeCtx([Permissions.reportRead]));
    await expect(can(Permissions.userBan)).resolves.toBe(false);
  });

  it('具备对应权限 → true', async () => {
    mocks.getAuthContext.mockResolvedValue(makeCtx([Permissions.userBan]));
    await expect(can(Permissions.userBan)).resolves.toBe(true);
  });

  it('权限集为空数组 → false', async () => {
    mocks.getAuthContext.mockResolvedValue(makeCtx([]));
    await expect(can(Permissions.userBan)).resolves.toBe(false);
  });
});

describe('requirePermission（守卫语义）', () => {
  beforeEach(() => {
    mocks.getAuthContext.mockReset();
  });

  it('未登录 → 抛 AuthError(AUTH_REQUIRED, 401)', async () => {
    mocks.getAuthContext.mockResolvedValue(null);
    await expect(requirePermission(Permissions.userBan)).rejects.toMatchObject({
      code: AUTH_ERROR_CODES.AUTH_REQUIRED,
      status: 401,
    });
  });

  it('无对应权限 → 抛 AuthError(FORBIDDEN, 403)', async () => {
    mocks.getAuthContext.mockResolvedValue(makeCtx([Permissions.reportRead]));
    await expect(requirePermission(Permissions.userBan)).rejects.toMatchObject({
      code: AUTH_ERROR_CODES.FORBIDDEN,
      status: 403,
    });
  });

  it('空权限集 → 抛 AuthError(FORBIDDEN)', async () => {
    mocks.getAuthContext.mockResolvedValue(makeCtx([]));
    await expect(requirePermission(Permissions.userBan)).rejects.toBeInstanceOf(AuthError);
    await expect(requirePermission(Permissions.userBan)).rejects.toMatchObject({
      code: AUTH_ERROR_CODES.FORBIDDEN,
    });
  });

  it('具备对应权限 → resolve 返回认证上下文', async () => {
    const ctx = makeCtx([Permissions.userBan]);
    mocks.getAuthContext.mockResolvedValue(ctx);
    await expect(requirePermission(Permissions.userBan)).resolves.toBe(ctx);
  });
});
