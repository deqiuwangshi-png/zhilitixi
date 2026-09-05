// 内容审核仓储层：三表（discoveries / square_posts / url_audit）合并列表 + 审核写操作。
// TODO(模块化迁移)：内容审核已迁移至 src/modules/content-review，页面/Server Actions 改从
// 模块导入（listContent / reviewItem / batchReviewItems）。本文件导出仍被
// components/features/review/review-table.tsx（ContentItem 类型）引用，故保留不动，
// 仅供兼容；listContent / applyReview 已不再被业务入口调用。
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { ReviewActionInput } from '@/lib/validations/review.schema';

export type ContentSource = 'discovery' | 'square' | 'url';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ContentItem {
  id: string;
  source: ContentSource;
  title: string;
  typeKind: string; // 发现 | 市集 | URL
  summary: string;
  image: string;
  authorName: string;
  category: string;
  status: ReviewStatus;
  views: number;
  createdAt: string | null;
}

/** 合并三表为统一审核行（状态判定：discovery.reason / square.url_status / url.risk） */
export async function listContent(): Promise<ContentItem[]> {
  const client = getSupabaseClient();
  const [{ data: d }, { data: s }, { data: u }] = await Promise.all([
    client.from('discoveries').select('*').order('created_at', { ascending: false }).limit(100),
    client.from('square_posts').select('*').order('created_at', { ascending: false }).limit(100),
    client.from('url_audit').select('*').order('created_at', { ascending: false }).limit(100),
  ]);
  const discoveries = d ?? [];
  const squares = s ?? [];
  const urls = u ?? [];

  // 联表用户名
  const userIds = new Set<string>();
  for (const x of discoveries) if (x.author_id) userIds.add(x.author_id);
  for (const x of squares) if (x.author_id) userIds.add(x.author_id);
  for (const x of urls) if (x.user_id) userIds.add(x.user_id);
  const userNames: Record<string, string> = {};
  if (userIds.size) {
    const { data: users } = await client.from('users').select('id,name').in('id', Array.from(userIds));
    for (const us of users ?? []) userNames[us.id] = us.name ?? '';
  }

  const out: ContentItem[] = [];

  for (const it of discoveries) {
    out.push({
      id: it.id,
      source: 'discovery',
      title: it.title || it.type || '未命名内容',
      typeKind: '发现',
      summary: it.note || it.description || '',
      image: it.media_url || '',
      authorName: userNames[it.author_id ?? ''] || '未知',
      category: it.type || '未分类',
      // review_status 优先（005 迁移后）；列缺失时 fallback 旧逻辑
      status: (it.review_status as ReviewStatus) || (it.reason ? 'rejected' : 'pending'),
      views: it.views ?? 0,
      createdAt: it.created_at,
    });
  }

  for (const it of squares) {
    out.push({
      id: it.id,
      source: 'square',
      title: (it.content || '').slice(0, 30),
      typeKind: '市集',
      summary: it.content || '',
      image: it.image_url || '',
      authorName: userNames[it.author_id ?? ''] || '未知',
      category: it.category || '未分类',
      status:
        (it.review_status as ReviewStatus) ||
        (it.url_status === 'blocked' ? 'rejected' : it.url_status === 'normal' ? 'approved' : 'pending'),
      views: it.views ?? 0,
      createdAt: it.created_at,
    });
  }

  for (const it of urls) {
    out.push({
      id: String(it.id),
      source: 'url',
      title: it.url || it.host || '未命名链接',
      typeKind: 'URL',
      summary: it.host || '',
      image: '',
      authorName: '—',
      category: it.host || '未知域名',
      status: it.risk === 'high' ? 'rejected' : it.risk && it.risk !== 'unknown' ? 'approved' : 'pending',
      views: 0,
      createdAt: it.created_at,
    });
  }

  return out;
}

/** 审核写操作（单条，供 SA 调用）：写 review_status + 维持 reason/url_status 语义 */
export async function applyReview(input: ReviewActionInput): Promise<void> {
  const client = getSupabaseClient();
  const { source, id, action, reason } = input;

  if (source === 'discovery') {
    const { error } = await client
      .from('discoveries')
      .update({
        review_status: action === 'approve' ? 'approved' : 'rejected',
        reason: action === 'approve' ? null : reason || '已驳回',
      })
      .eq('id', id);
    if (error) throw new Error(`review discovery failed: ${error.message}`);
  } else if (source === 'square') {
    // 拍板语义：驳回只标记 blocked，保留 url 字段可回溯
    const { error } = await client
      .from('square_posts')
      .update({
        review_status: action === 'approve' ? 'approved' : 'rejected',
        url_status: action === 'approve' ? 'normal' : 'blocked',
      })
      .eq('id', id);
    if (error) throw new Error(`review square failed: ${error.message}`);
  } else {
    // url_audit 以 risk 承载审核状态（id 为 int64）
    const { error } = await client
      .from('url_audit')
      .update({ risk: action === 'approve' ? 'low' : 'high' })
      .eq('id', Number(id));
    if (error) throw new Error(`review url failed: ${error.message}`);
  }
}
