// 侵权与申诉仓储层：申诉处理写操作 + 兼容导出。
// TODO(阶段六): listAppeals 已迁移至 src/modules/appeal/appeal.queries.ts（DB union 视图
// v_appeal_catalog：全局 count + order，不再固定 limit(100) 合并）。本文件保留
// applyAppealAction（commands 复用）与 AppealItem 类型（旧前端组件从 @/lib/repos/
// appeal-repo 引用）兼容，勿删仍被引用的导出。
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import type { AppealItem, AppealSource } from '@/modules/appeal';

// 类型单一来源 = modules/appeal（与旧定义同形，结构兼容）。
export type { AppealItem, AppealSource };

/** 申诉处理：restore 恢复发布 / dismiss 维持处罚 */
export async function applyAppealAction(
  source: AppealSource,
  id: string,
  action: 'restore' | 'dismiss'
): Promise<void> {
  const client = getSupabasePrivilegedClient();
  if (source === 'discovery') {
    const { error } = await client
      .from('discoveries')
      .update({ reason: action === 'restore' ? null : '申诉不成立，维持原判' })
      .eq('id', id);
    if (error) throw new Error(`applyAppealAction failed: ${error.message}`);
  } else {
    // square：恢复发布 = 解除 blocked；维持处罚 = 保持 blocked（无需写入）
    if (action === 'restore') {
      const { error } = await client
        .from('square_posts')
        .update({ url_status: 'normal' })
        .eq('id', id);
      if (error) throw new Error(`applyAppealAction failed: ${error.message}`);
    }
  }
}
