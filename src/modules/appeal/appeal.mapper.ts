// 侵权与申诉模块：行归一化映射（从旧 appeal-repo 迁移，字段与 AppealItem 完全一致）。
import type { AppealItem, AppealRowData, AppealSource } from './appeal.types';

/**
 * 单个视图裸行 → AppealItem DTO。
 * 与旧 appeal-repo 逻辑一致：title/reason/content/note/description 按 src 取值，
 * authorName 由外部联表映射（queries 回查窗口内作者）。
 */
export function rowToDto(r: AppealRowData, userNames: Record<string, string>): AppealItem {
  const source = r.src === 'square' ? ('square' as AppealSource) : ('discovery' as AppealSource);

  return {
    source,
    id: r.id,
    // discovery：title||note||description||'未命名'；square：content 前 40 字||'未命名'
    title:
      source === 'square'
        ? (r.content ?? '').slice(0, 40) || '未命名'
        : r.title || r.note || r.description || '未命名',
    reason: source === 'square' ? '违规链接' : (r.norm_reason ?? null),
    url: r.url ?? null,
    content: source === 'square' ? r.content : null,
    note: source === 'discovery' ? r.note : null,
    description: source === 'discovery' ? r.description : null,
    authorName: userNames[r.author_id ?? ''] || '用户',
    status: 'needs_review',
  };
}