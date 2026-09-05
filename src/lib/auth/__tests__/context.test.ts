// context.ts 权限解析单测（由 tests/context.test.mjs 平移为 vitest 单测）。
// 覆盖：filterGrantedPermissions 过滤边界 + loadUserPermissions fail-closed + getAuthContext 组装。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
import { Permissions } from '@/lib/auth/permissions';
import {
  filterGrantedPermissions,
  getAuthContext,
  getAuthContextOrThrow,
  loadUserPermissions,
} from '@/lib/auth/context';

const mocks = vi.hoisted(() => ({
  getCurrentAdmin: vi.fn(),
  getSessionRlsClient: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getCurrentAdmin: mocks.getCurrentAdmin }));
vi.mock('@/lib/auth/session-client', () => ({ getSessionRlsClient: mocks.getSessionRlsClient }));

interface StubRows {
  user_roles?: Array<{ role_id: string }>;
  role_permissions?: Array<{ permission_id: string }>;
  permissions?: Array<{ id: string }>;
}

/** 幂等查询构建器：await client.from(t).select().eq()/in() 时返回 { data: rows[t] ?? [] } */
function stubRlsClient(rows: StubRows): { from: (table: string) => QueryThenable } {
  return {
    from: (table: string) => {
      const builder: QueryThenable = {
        select() {
          return builder;
        },
        eq() {
          return builder;
        },
        in() {
          return builder;
        },
        then(resolve) {
          return Promise.resolve({ data: rows[table as keyof StubRows] ?? [] }).then(resolve);
        },
      };
      return builder;
    },
  };
}

type QueryThenable = {
  select: () => QueryThenable;
  eq: () => QueryThenable;
  in: () => QueryThenable;
  then: <R>(onfulfilled: (value: { data: unknown[] }) => R | PromiseLike<R>) => Promise<R>;
};

describe('filterGrantedPermissions（纯函数）', () => {
  it('无任何授予 → 空权限集', () => {
    expect(filterGrantedPermissions([])).toEqual([]);
  });

  it('仅授予未知权限 id → 空权限集（未知 id 被过滤）', () => {
    expect(filterGrantedPermissions(['not-a-real-permission'])).toEqual([]);
  });

  it('授予已知权限子集 → 返回对应子集且保持 Permissions 定义顺序', () => {
    expect(filterGrantedPermissions([Permissions.userBan, Permissions.reportRead])).toEqual([
      Permissions.reportRead,
      Permissions.userBan,
    ]);
  });

  it('授予全部已知权限 → 返回完整权限集', () => {
    expect(filterGrantedPermissions(Object.values(Permissions))).toEqual(Object.values(Permissions));
  });
});

describe('loadUserPermissions（fail-closed 语义）', () => {
  beforeEach(() => {
    mocks.getSessionRlsClient.mockReset();
  });

  it('user_roles 查询返回空 → 空权限集', async () => {
    mocks.getSessionRlsClient.mockResolvedValue(stubRlsClient({ user_roles: [] }));
    await expect(loadUserPermissions('user-1')).resolves.toEqual([]);
  });

  it('角色存在但 role_permissions 为空 → 空权限集', async () => {
    mocks.getSessionRlsClient.mockResolvedValue(
      stubRlsClient({ user_roles: [{ role_id: 'role-1' }], role_permissions: [] }),
    );
    await expect(loadUserPermissions('user-1')).resolves.toEqual([]);
  });

  it('role_permissions 有值但 permissions 表无对应行 → 空权限集', async () => {
    mocks.getSessionRlsClient.mockResolvedValue(
      stubRlsClient({
        user_roles: [{ role_id: 'role-1' }],
        role_permissions: [{ permission_id: 'report.read' }],
        permissions: [],
      }),
    );
    await expect(loadUserPermissions('user-1')).resolves.toEqual([]);
  });

  it('查询抛错 → 空权限集（异常即拒绝，不向调用方抛出）', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.getSessionRlsClient.mockRejectedValue(new Error('db down'));
    await expect(loadUserPermissions('user-1')).resolves.toEqual([]);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('正常授予 → 返回对应权限子集（按 Permissions 定义顺序，未知 id 被过滤）', async () => {
    mocks.getSessionRlsClient.mockResolvedValue(
      stubRlsClient({
        user_roles: [{ role_id: 'role-1' }],
        role_permissions: [
          { permission_id: 'user.ban' },
          { permission_id: 'report.read' },
          { permission_id: 'unknown.x' },
        ],
        permissions: [{ id: 'user.ban' }, { id: 'report.read' }],
      }),
    );
    await expect(loadUserPermissions('user-1')).resolves.toEqual([
      Permissions.reportRead,
      Permissions.userBan,
    ]);
  });
});

describe('getAuthContext / getAuthContextOrThrow（组装与守卫）', () => {
  beforeEach(() => {
    mocks.getCurrentAdmin.mockReset();
    mocks.getSessionRlsClient.mockReset();
  });

  it('未登录（getCurrentAdmin 为 null）→ 返回 null', async () => {
    mocks.getCurrentAdmin.mockResolvedValue(null);
    await expect(getAuthContext()).resolves.toBeNull();
  });

  it('管理员登录 + 权限解析 → 组装 admin 上下文', async () => {
    mocks.getCurrentAdmin.mockResolvedValue({ userId: 'admin-1', name: '管理员' });
    mocks.getSessionRlsClient.mockResolvedValue(
      stubRlsClient({
        user_roles: [{ role_id: 'role-1' }],
        role_permissions: [{ permission_id: 'report.read' }],
        permissions: [{ id: 'report.read' }],
      }),
    );
    await expect(getAuthContext()).resolves.toEqual({
      userId: 'admin-1',
      name: '管理员',
      role: 'admin',
      permissions: [Permissions.reportRead],
    });
  });

  it('getAuthContextOrThrow：未登录 → 抛 AUTH_REQUIRED', async () => {
    mocks.getCurrentAdmin.mockResolvedValue(null);
    await expect(getAuthContextOrThrow()).rejects.toMatchObject({
      code: AUTH_ERROR_CODES.AUTH_REQUIRED,
      status: 401,
    });
    await expect(getAuthContextOrThrow()).rejects.toBeInstanceOf(AuthError);
  });
});
