// 用户管理仓储层（过渡兼容）：处罚流水分组 + 旧前端组件引用的 DTO 类型。
// 用户列表 / 治理操作已迁移至 src/modules/users；本文件仅保留 listPenaltiesGrouped
// （被 modules/users/queries 复用）与旧组件类型别名（指向 modules/users 的同一类型源），勿删。
import { getSessionRlsClient } from '@/lib/auth/session-client';
import type { GovStatus, GovRole, PenaltyAction, PenaltyRecord, UserItem } from '@/modules/users';

// 类型单一来源 = modules/users；UserListItem 为旧组件引用的兼容别名。
export type {
  GovStatus,
  GovRole,
  PenaltyAction,
  PenaltyRecord,
  UserItem as UserListItem,
};

/** 处罚流水，按 user_id 分组（供列表详情抽屉；Record 便于 RSC 序列化）。
 * 有界预览语义：仅覆盖最近 500 条流水（列表抽屉的"最近处罚"展示），非全量；
 * 全量/按用户分页统计以 users.penalty_count 为准，后续模块化时在
 * modules/users 内提供按用户 count+range 的流水分页，勿在此扩成全表拉取。 */
export async function listPenaltiesGrouped(): Promise<Record<string, PenaltyRecord[]>> {
  const client = await getSessionRlsClient();
  const { data, error } = await client
    .from('governance_penalties')
    .select('id,user_id,action,reason,operator_id,created_at')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(`listPenalties failed: ${error.message}`);
  const rows = data ?? [];

  const operatorIds = Array.from(
    new Set(rows.map((p) => p.operator_id).filter((x): x is string => !!x))
  );
  const names: Record<string, string> = {};
  if (operatorIds.length) {
    const { data: ops } = await client.from('users').select('id,name').in('id', operatorIds);
    for (const o of ops ?? []) names[o.id] = o.name ?? '';
  }

  const map: Record<string, PenaltyRecord[]> = {};
  for (const p of rows) {
    const rec: PenaltyRecord = {
      id: p.id,
      action: p.action as PenaltyAction,
      reason: p.reason ?? '',
      operator: names[p.operator_id ?? ''] ?? '',
      at: p.created_at ?? '',
    };
    (map[p.user_id] ??= []).push(rec);
  }
  return map;
}
