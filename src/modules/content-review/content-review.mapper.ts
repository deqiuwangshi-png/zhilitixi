// 内容审核模块：行归一化映射（从旧 content-repo.listContent 迁移，字段与 ReviewItem 一致）。
import type { DiscoveriesRow, SquarePostsRow, UrlAuditRow } from '@/lib/db-types';
import type { ReviewItem, ReviewStatus } from './content-review.types';

/** 行归一化所需的联表用户名上下文（由 queries 在页内构建后传入） */
export interface RowContext {
  userNames: Record<string, string>;
}

/** discoveries 行 → ReviewItem（review_status 优先，005 迁移后；缺失时 fallback 旧逻辑） */
export function discoveryRowToItem(row: DiscoveriesRow, ctx: RowContext): ReviewItem {
  return {
    id: row.id,
    source: 'discovery',
    title: row.title || row.type || '未命名内容',
    typeKind: '发现',
    summary: row.note || row.description || '',
    image: row.media_url || '',
    authorName: ctx.userNames[row.author_id ?? ''] || '未知',
    category: row.type || '未分类',
    status: (row.review_status as ReviewStatus) || (row.reason ? 'rejected' : 'pending'),
    views: row.views ?? 0,
    createdAt: row.created_at,
  };
}

/** square_posts 行 → ReviewItem（拍板语义：blocked/normal 映射 status） */
export function squareRowToItem(row: SquarePostsRow, ctx: RowContext): ReviewItem {
  return {
    id: row.id,
    source: 'square',
    title: (row.content || '').slice(0, 30),
    typeKind: '市集',
    summary: row.content || '',
    image: row.image_url || '',
    authorName: ctx.userNames[row.author_id ?? ''] || '未知',
    category: row.category || '未分类',
    status:
      (row.review_status as ReviewStatus) ||
      (row.url_status === 'blocked' ? 'rejected' : row.url_status === 'normal' ? 'approved' : 'pending'),
    views: row.views ?? 0,
    createdAt: row.created_at,
  };
}

/** url_audit 行 → ReviewItem（id 为 int64，转字符串保持 source-id 幂等） */
export function urlRowToItem(row: UrlAuditRow): ReviewItem {
  return {
    id: String(row.id),
    source: 'url',
    title: row.url || row.host || '未命名链接',
    typeKind: 'URL',
    summary: row.host || '',
    image: '',
    authorName: '—',
    category: row.host || '未知域名',
    status: row.risk === 'high' ? 'rejected' : row.risk && row.risk !== 'unknown' ? 'approved' : 'pending',
    views: 0,
    createdAt: row.created_at,
  };
}