// report.schema.ts 单测：reportListQuerySchema 边界（pageSize 白名单 / 非法 page / repeat 口径）+ toReportListQuery 收敛。
import { describe, expect, it } from 'vitest';
import {
  OPTION_ALL,
  reportListQuerySchema,
  toReportListQuery,
} from '@/modules/report/report.schema';

describe('reportListQuerySchema（URL searchParams 校验）', () => {
  it('空对象 → 成功（全部字段可选）', () => {
    expect(reportListQuerySchema.safeParse({}).success).toBe(true);
  });

  it('page 合法（字符串数字被 coerce）', () => {
    expect(reportListQuerySchema.safeParse({ page: '2' }).success).toBe(true);
  });

  it('page 小于 1 / 非数字 → 失败', () => {
    expect(reportListQuerySchema.safeParse({ page: '0' }).success).toBe(false);
    expect(reportListQuerySchema.safeParse({ page: 'abc' }).success).toBe(false);
  });

  it('size 白名单内 → 成功；白名单外 / 非整数 → 失败', () => {
    expect(reportListQuerySchema.safeParse({ size: '20' }).success).toBe(true);
    expect(reportListQuerySchema.safeParse({ size: '100' }).success).toBe(true);
    expect(reportListQuerySchema.safeParse({ size: '15' }).success).toBe(false);
    expect(reportListQuerySchema.safeParse({ size: '20.5' }).success).toBe(false);
  });

  it('筛选字段（status/type/reason/repeat/q）任意组合可解析', () => {
    const parsed = reportListQuerySchema.safeParse({
      status: 'pending',
      type: '商品',
      reason: '虚假宣传',
      repeat: 'repeat',
      q: '  某链接  ',
    });
    expect(parsed.success).toBe(true);
  });
});

describe('toReportListQuery（URL 值 → 查询条件）', () => {
  it('空输入 → 默认 page=1 / pageSize=20，筛选字段为 undefined', () => {
    expect(toReportListQuery({})).toEqual({
      page: 1,
      pageSize: 20,
      status: undefined,
      type: undefined,
      reason: undefined,
      repeat: undefined,
      q: undefined,
    });
  });

  it('占位值收敛：status=all / type=全部 / reason=全部 → undefined', () => {
    expect(
      toReportListQuery({ status: 'all', type: OPTION_ALL, reason: OPTION_ALL }),
    ).toMatchObject({ status: undefined, type: undefined, reason: undefined });
  });

  it('repeat 口径：仅 repeat=repeat → true，其余 → undefined', () => {
    expect(toReportListQuery({ repeat: 'repeat' }).repeat).toBe(true);
    expect(toReportListQuery({ repeat: 'all' }).repeat).toBeUndefined();
    expect(toReportListQuery({}).repeat).toBeUndefined();
  });

  it('真实筛选值透传 + q 去除首尾空白', () => {
    expect(
      toReportListQuery({ status: 'pending', type: '商品', q: '  abc  ' }),
    ).toMatchObject({ status: 'pending', type: '商品', q: 'abc' });
  });
});
