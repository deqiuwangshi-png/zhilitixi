// users.schema.ts 单测：userListQuerySchema 边界（pageSize 白名单 / 非法 page / 可选字段）+ toUserListQuery 收敛。
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE_SIZE,
  SIZES,
  toUserListQuery,
  userListQuerySchema,
} from '@/modules/users/users.schema';

describe('userListQuerySchema（URL searchParams 校验）', () => {
  it('空对象 → 成功（全部字段可选）', () => {
    expect(userListQuerySchema.safeParse({}).success).toBe(true);
  });

  it('page 合法（字符串数字被 coerce 为 number）', () => {
    expect(userListQuerySchema.safeParse({ page: '2' }).success).toBe(true);
    expect(userListQuerySchema.safeParse({ page: 2 }).success).toBe(true);
  });

  it('page 小于 1 → 失败', () => {
    expect(userListQuerySchema.safeParse({ page: '0' }).success).toBe(false);
    expect(userListQuerySchema.safeParse({ page: '-1' }).success).toBe(false);
  });

  it('page 非数字 → 失败', () => {
    expect(userListQuerySchema.safeParse({ page: 'abc' }).success).toBe(false);
  });

  it('size 在白名单内 → 成功', () => {
    for (const size of SIZES) {
      expect(userListQuerySchema.safeParse({ size: String(size) }).success).toBe(true);
    }
  });

  it('size 不在白名单 → 失败', () => {
    expect(userListQuerySchema.safeParse({ size: '15' }).success).toBe(false);
    expect(userListQuerySchema.safeParse({ size: '999' }).success).toBe(false);
  });

  it('size 非整数 → 失败', () => {
    expect(userListQuerySchema.safeParse({ size: '10.5' }).success).toBe(false);
  });

  it('可选筛选字段（status/role/anomaly/q）任意组合可解析', () => {
    const parsed = userListQuerySchema.safeParse({
      status: 'banned',
      role: 'moderator',
      anomaly: 'yes',
      q: '  张三  ',
      page: '3',
      size: '50',
    });
    expect(parsed.success).toBe(true);
  });
});

describe('toUserListQuery（URL 值 → 查询条件）', () => {
  it('空输入 → 默认 page=1 / pageSize=10，筛选字段为 undefined', () => {
    expect(toUserListQuery({})).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      status: undefined,
      role: undefined,
      anomaly: undefined,
      q: undefined,
    });
  });

  it('占位值 all → 收敛为 undefined', () => {
    expect(
      toUserListQuery({ status: 'all', role: 'all' }),
    ).toMatchObject({ status: undefined, role: undefined });
  });

  it('真实筛选值透传', () => {
    expect(
      toUserListQuery({ status: 'banned', role: 'moderator', anomaly: 'yes' }),
    ).toMatchObject({ status: 'banned', role: 'moderator', anomaly: 'yes' });
  });

  it('q 去除首尾空白；纯空白 → undefined', () => {
    expect(toUserListQuery({ q: '  张三  ' }).q).toBe('张三');
    expect(toUserListQuery({ q: '   ' }).q).toBeUndefined();
  });

  it('显式 size 生效，page 透传', () => {
    expect(toUserListQuery({ page: 3, size: 50 })).toMatchObject({ page: 3, pageSize: 50 });
  });
});
