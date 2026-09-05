// permissions.ts 单测：ALL_PERMISSIONS 与 Permissions 的一致性、命名规范（resource.action）。
import { describe, expect, it } from 'vitest';
import { ALL_PERMISSIONS, Permissions, type Permission } from '@/lib/auth/permissions';

const RESOURCE_ACTION_RE = /^[a-z]+\.[a-z]+$/;

describe('permissions 定义', () => {
  it('权限名全部符合 resource.action 命名模式', () => {
    for (const value of Object.values(Permissions)) {
      expect(value, `权限名 ${value} 不符合 resource.action 模式`).toMatch(RESOURCE_ACTION_RE);
    }
  });

  it('权限名无重复（每个权限唯一）', () => {
    const values = Object.values(Permissions);
    expect(new Set(values).size).toBe(values.length);
  });

  it('ALL_PERMISSIONS 与 Permissions 完全一致（同一来源）', () => {
    expect(ALL_PERMISSIONS).toEqual(Object.values(Permissions));
  });

  it('ALL_PERMISSIONS 覆盖全部权限值', () => {
    for (const permission of Object.values(Permissions)) {
      expect(ALL_PERMISSIONS).toContain(permission);
    }
  });

  it('Permission 类型取值均在 ALL_PERMISSIONS 中（编译期断言辅助）', () => {
    const sample: readonly Permission[] = [
      Permissions.reportRead,
      Permissions.userBan,
      Permissions.overviewRead,
    ];
    for (const p of sample) {
      expect(ALL_PERMISSIONS).toContain(p);
    }
  });
});
