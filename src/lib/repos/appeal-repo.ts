// 侵权与申诉仓储层：被标记内容（discoveries.reason / square_posts.blocked）合并 + 申诉处理。
// TODO(阶段六): listAppeals 已迁移至 src/modules/appeal/appeal.queries.ts（DB union 视图
// v_appeal_catalog：全局 count + order，不再固定 limit(100) 合并），写操作经 commands
// 复用本文件的 applyAppealAction。以下导出保留供旧前端组件（从 @/lib/repos/appeal-repo
// 引用 AppealItem）兼容，勿删仍被引用的导出。
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';

export type AppealSource = 'discovery' | 'square';

export interface AppealItem {
  source: AppealSource;
  id: string;
  title: string;
  reason: string | null;
  url: string | null;
  content: string | null;
  note: string | null;
  description: string | null;
  authorName: string;
  /** 目前无状态存储，全部为待复核；resolved/dismissed tab 显示空态 */
  status: 'needs_review';
}

/** 申诉案件列表：discoveries(reason 非空) + square_posts(blocked)，带真实 source */
export async function listAppeals(): Promise<AppealItem[]> {
  const client = getSupabasePrivilegedClient();
  const [{ data: discoveries }, { data: squarePosts }] = await Promise.all([
    client.from('discoveries').select('*').order('created_at', { ascending: false }).limit(100),
    client.from('square_posts').select('*').order('created_at', { ascending: false }).limit(100),
  ]);
  const discoveryAppeals = (discoveries ?? []).filter((d) => d.reason);
  const postAppeals = (squarePosts ?? []).filter((p) => p.url_status === 'blocked');

  // 联表用户名
  const userIds = new Set<string>();
  for (const x of discoveryAppeals) if (x.author_id) userIds.add(x.author_id);
  for (const x of postAppeals) if (x.author_id) userIds.add(x.author_id);
  const userNames: Record<string, string> = {};
  if (userIds.size) {
    const { data: users } = await client.from('users').select('id,name').in('id', Array.from(userIds));
    for (const u of users ?? []) userNames[u.id] = u.name ?? '';
  }

  const items: AppealItem[] = [
    ...discoveryAppeals.map((d) => ({
      source: 'discovery' as const,
      id: d.id,
      title: d.title || d.note || d.description || '未命名',
      reason: d.reason,
      url: d.url,
      content: null, // discoveries 无 content 列
      note: d.note,
      description: d.description,
      authorName: userNames[d.author_id ?? ''] || '用户',
      status: 'needs_review' as const,
    })),
    ...postAppeals.map((p) => ({
      source: 'square' as const,
      id: p.id,
      title: (p.content || '').slice(0, 40) || '未命名',
      reason: '违规链接',
      url: p.url,
      content: p.content,
      note: null,
      description: null,
      authorName: userNames[p.author_id ?? ''] || '用户',
      status: 'needs_review' as const,
    })),
  ];

  return items;
}

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
