// 商品治理模块：行归一化映射（从旧 product-repo 迁移，字段与 ProductItem 完全一致）。
import type { DiscoveryRowData, ProductItem, SquareRowData } from './product-gov.types';

/**
 * discovery 裸行 → ProductItem DTO。
 * 与旧 product-repo 的商业化内容映射逻辑一致：status 取 reason 是否为空。
 */
export function discoveryToDto(d: DiscoveryRowData, names: Record<string, string>): ProductItem {
  return {
    source: 'discovery',
    id: d.id,
    title: d.note || d.title || d.description || '未命名商品',
    kind: d.type || '商业推广',
    commercial: !!d.commercial,
    commission: d.commission != null ? d.commission : null,
    promoType: d.promo_type || '',
    url: d.url || '',
    status: (d.reason ? '下架' : '上架'),
    authorName: names[d.author_id ?? ''] || '用户',
    createdAt: d.created_at,
    reason: d.reason,
  };
}

/**
 * square_posts 裸行 → ProductItem DTO。
 * 与旧 product-repo 的链接帖子映射逻辑一致：status 取 url_status 是否 blocked。
 */
export function squareToDto(p: SquareRowData, names: Record<string, string>): ProductItem {
  return {
    source: 'square',
    id: p.id,
    title: p.content || '未命名帖子',
    kind: p.category || '帖子',
    commercial: false,
    commission: null,
    promoType: '',
    url: p.url || '',
    status: (p.url_status === 'blocked' ? '下架' : '上架'),
    authorName: names[p.author_id ?? ''] || '用户',
    createdAt: p.created_at,
    reason: p.url_status,
  };
}