// 用户治理关键流程集成测试（stub 客户端层，始终运行）。
// 聚焦模块查询/命令函数：listUsers 的筛选分页参数断言（stub getSessionRlsClient），
// 以及 updateUserStatus / updateUserRole / updateUserProfile 的
// 「授权 → 校验 → 事务 RPC 参数」端到端断言（stub policy + privileged client）。
// 真实库 SQL/RPC 断言见 db-rpc.test.ts（需 DATABASE_URL）。
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthContext } from '@/lib/auth/context';
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
import { updateUserProfile, updateUserRole, updateUserStatus } from '@/modules/users/users.commands';
import { listUsers } from '@/modules/users/users.queries';
import type { UserListQuery, UserRowData } from '@/modules/users/users.types';

const mocks = vi.hoisted(() => ({
  getSessionRlsClient: vi.fn(),
  getSupabasePrivilegedClient: vi.fn(),
  rpc: vi.fn(),
  requireUserBan: vi.fn(),
  requireUserEdit: vi.fn(),
}));

vi.mock('@/lib/auth/session-client', () => ({ getSessionRlsClient: mocks.getSessionRlsClient }));
vi.mock('@/storage/database/supabase-client', () => ({
  getSupabasePrivilegedClient: mocks.getSupabasePrivilegedClient,
}));
vi.mock('@/modules/users/users.policy', () => ({
  requireUserBan: mocks.requireUserBan,
  requireUserEdit: mocks.requireUserEdit,
}));

const ADMIN_CTX: AuthContext = {
  userId: 'operator-1',
  name: '操作员',
  role: 'admin',
  permissions: [],
};

/** listUsers 的 RLS 客户端桩：记录查询链并返回可配置结果 */
type ListBuilder = {
  select: (cols?: unknown, opts?: unknown) => ListBuilder;
  order: (col: unknown, opts?: unknown) => ListBuilder;
  eq: (col: unknown, val: unknown) => ListBuilder;
  not: (col: unknown, op: unknown, val: unknown) => ListBuilder;
  neq: (col: unknown, val: unknown) => ListBuilder;
  or: (expr: unknown) => ListBuilder;
  ilike: (col: unknown, val: unknown) => ListBuilder;
  range: (from: number, to: number) => Promise<{ data: unknown[]; count: number | null }>;
};

function stubListUsersClient() {
  const calls: string[] = [];
  let data: unknown[] = [];
  let count: number | null = 0;
  const builder: ListBuilder = {
    select(_cols, _opts) {
      calls.push('select');
      return builder;
    },
    order(_col, _opts) {
      calls.push('order');
      return builder;
    },
    eq(col, val) {
      calls.push(`eq:${String(col)}=${String(val)}`);
      return builder;
    },
    not(col, _op, _val) {
      calls.push(`not:${String(col)}`);
      return builder;
    },
    neq(col, val) {
      calls.push(`neq:${String(col)}=${String(val)}`);
      return builder;
    },
    or(expr) {
      calls.push(`or:${String(expr)}`);
      return builder;
    },
    ilike(col, val) {
      calls.push(`ilike:${String(col)}=${String(val)}`);
      return builder;
    },
    range(from, to) {
      calls.push(`range:${from}-${to}`);
      return Promise.resolve({ data, count });
    },
  };
  return {
    client: {
      from: (table: string) => {
        calls.push(`from:${table}`);
        return builder;
      },
    },
    calls,
    setResult(rows: unknown[], total: number | null) {
      data = rows;
      count = total;
    },
  };
}

const FULL_ROW: UserRowData = {
  id: 'user-1',
  name: '张三',
  bio: '简介',
  avatar_url: 'https://example.com/a.png',
  points: 120,
  created_at: '2026-01-01T00:00:00.000Z',
  cover_url: null,
  badge: 'vip',
  gov_status: 'banned',
  gov_role: 'user',
  anomaly: '封禁标记',
  penalty_count: 2,
  ban_until: '2026-01-08T00:00:00.000Z',
  rate_limit_until: null,
};

describe('listUsers（查询层：数据库分页 + 筛选下沉）', () => {
  let stub: ReturnType<typeof stubListUsersClient>;

  beforeEach(() => {
    stub = stubListUsersClient();
    mocks.getSessionRlsClient.mockReset();
    mocks.getSessionRlsClient.mockResolvedValue(stub.client);
  });

  it('基础查询：from users + select + order + range(0-9)，total/count 透传', async () => {
    stub.setResult([FULL_ROW], 45);
    const result = await listUsers({ page: 1, pageSize: 10 });
    expect(stub.calls).toEqual(['from:users', 'select', 'order', 'range:0-9']);
    expect(result.total).toBe(45);
    expect(result.totalPages).toBe(5);
    expect(result.rows[0]).toMatchObject({
      id: 'user-1',
      name: '张三',
      status: 'banned',
      role: 'moderator', // badge=vip → role 受 badge 影响
      penaltyCount: 2,
    });
  });

  it('status/role 筛选 → eq 下沉', async () => {
    await listUsers({ page: 1, pageSize: 10, status: 'banned', role: 'moderator' });
    expect(stub.calls).toContain('eq:gov_status=banned');
    expect(stub.calls).toContain('eq:gov_role=moderator');
  });

  it('anomaly=yes → not(anomaly is null) + neq(anomaly,空串)', async () => {
    await listUsers({ page: 1, pageSize: 10, anomaly: 'yes' });
    expect(stub.calls).toContain('not:anomaly');
    expect(stub.calls).toContain('neq:anomaly=');
  });

  it('anomaly=no → or(anomaly.is.null,anomaly.eq.\'\')', async () => {
    await listUsers({ page: 1, pageSize: 10, anomaly: 'no' });
    expect(stub.calls).toContain(`or:anomaly.is.null,anomaly.eq.''`);
  });

  it('q 关键字 → ilike name（模糊匹配）', async () => {
    await listUsers({ page: 1, pageSize: 10, q: '张三' });
    expect(stub.calls).toContain('ilike:name=%张三%');
  });

  it('分页：page=2 size=20 → range(20-39)', async () => {
    await listUsers({ page: 2, pageSize: 20 });
    expect(stub.calls).toContain('range:20-39');
  });

  it('pageSize 白名单收敛：非法值回退默认 10（防御，schema 侧已拦）', async () => {
    const query = { page: 1, pageSize: 999 } as UserListQuery;
    await listUsers(query);
    expect(stub.calls).toContain('range:0-9');
  });
});

describe('updateUserStatus（治理动作：授权 → 校验 → 事务 RPC）', () => {
  beforeEach(() => {
    mocks.requireUserBan.mockReset();
    mocks.getSupabasePrivilegedClient.mockReset();
    mocks.rpc.mockReset();
    mocks.getSupabasePrivilegedClient.mockReturnValue({ rpc: mocks.rpc });
  });

  it('合法 ban 请求 → 以幂等 RPC 参数落库（p_request_id=null）', async () => {
    mocks.requireUserBan.mockResolvedValue(ADMIN_CTX);
    mocks.rpc.mockResolvedValue({ error: null });
    await updateUserStatus({ id: 'user-1', action: 'ban', reason: '违规内容' });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith('apply_governance_action', {
      p_user_id: 'user-1',
      p_action: 'ban',
      p_reason: '违规内容',
      p_operator_id: 'operator-1',
      p_request_id: null,
    });
  });

  it('无 user.ban 权限 → 抛 FORBIDDEN 且不触 RPC', async () => {
    mocks.requireUserBan.mockRejectedValue(new AuthError(AUTH_ERROR_CODES.FORBIDDEN));
    await expect(updateUserStatus({ id: 'user-1', action: 'ban', reason: '' })).rejects.toMatchObject({
      code: AUTH_ERROR_CODES.FORBIDDEN,
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('非法 action → 抛 VALIDATION_FAILED 且不触 RPC', async () => {
    mocks.requireUserBan.mockResolvedValue(ADMIN_CTX);
    await expect(
      updateUserStatus({ id: 'user-1', action: 'delete' as never, reason: '' }),
    ).rejects.toMatchObject({ code: AUTH_ERROR_CODES.VALIDATION_FAILED });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('RPC 返回错误 → 抛 INTERNAL_ERROR 稳定文案，不泄露底层错误', async () => {
    mocks.requireUserBan.mockResolvedValue(ADMIN_CTX);
    mocks.rpc.mockResolvedValue({ error: { message: 'pg: secret constraint violation' } });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(updateUserStatus({ id: 'user-1', action: 'ban', reason: '' })).rejects.toMatchObject({
      code: AUTH_ERROR_CODES.INTERNAL_ERROR,
      message: '治理操作失败，请稍后重试',
    });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('updateUserRole / updateUserProfile（资料+角色原子 RPC）', () => {
  beforeEach(() => {
    mocks.requireUserEdit.mockReset();
    mocks.getSupabasePrivilegedClient.mockReset();
    mocks.rpc.mockReset();
    mocks.getSupabasePrivilegedClient.mockReturnValue({ rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({ error: null });
  });

  it('updateUserRole → edit_user_profile_and_role 单事务写角色', async () => {
    mocks.requireUserEdit.mockResolvedValue(ADMIN_CTX);
    await updateUserRole({ id: 'user-1', role: 'moderator' });
    expect(mocks.rpc).toHaveBeenCalledWith('edit_user_profile_and_role', {
      p_user_id: 'user-1',
      p_role: 'moderator',
      p_name: null,
      p_points: null,
      p_badge: null,
      p_operator_id: 'operator-1',
      p_request_id: null,
    });
  });

  it('updateUserRole 非法角色 → VALIDATION_FAILED 且不触 RPC', async () => {
    mocks.requireUserEdit.mockResolvedValue(ADMIN_CTX);
    await expect(updateUserRole({ id: 'user-1', role: 'superuser' as never })).rejects.toMatchObject({
      code: AUTH_ERROR_CODES.VALIDATION_FAILED,
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('updateUserProfile → 资料 + 可选角色在同一 RPC 内原子写', async () => {
    mocks.requireUserEdit.mockResolvedValue(ADMIN_CTX);
    await updateUserProfile({ id: 'user-1', name: '新昵称', points: 120, badge: 'vip', role: 'moderator' });
    expect(mocks.rpc).toHaveBeenCalledWith('edit_user_profile_and_role', {
      p_user_id: 'user-1',
      p_role: 'moderator',
      p_name: '新昵称',
      p_points: 120,
      p_badge: 'vip',
      p_operator_id: 'operator-1',
      p_request_id: null,
    });
  });

  it('updateUserProfile 未传字段 → RPC 参数为 null（不改动对应列）', async () => {
    mocks.requireUserEdit.mockResolvedValue(ADMIN_CTX);
    await updateUserProfile({ id: 'user-1', name: '只改名' });
    expect(mocks.rpc).toHaveBeenCalledWith('edit_user_profile_and_role', {
      p_user_id: 'user-1',
      p_role: null,
      p_name: '只改名',
      p_points: null,
      p_badge: null,
      p_operator_id: 'operator-1',
      p_request_id: null,
    });
  });
});
