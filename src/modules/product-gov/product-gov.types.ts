// 商品治理模块：领域类型定义。
// 字段与前端 ProductClient / ProductTable / ProductEditDrawer / ProductStats 期望完全一致。
import type { DiscoveriesRow, SquarePostsRow } from '@/lib/db-types';

/** 商品数据来源（discoveries / square_posts） */
export type ProductSource = 'discovery' | 'square';

/** 商品状态（由 reason / url_status 收敛） */
export type ProductStatus = '上架' | '下架';

/** 商品列表行 DTO */
export interface ProductItem {
  source: ProductSource;
  id: string;
  title: string;
  kind: string;
  commercial: boolean;
  commission: string | number | null;
  promoType: string;
  url: string;
  status: ProductStatus;
  authorName: string;
  createdAt: string | null;
  reason: string | null;
}

/** 商品列表筛选 + 分页查询条件（服务端构造，数据库分页筛选） */
export interface ProductListQuery {
  page: number;
  pageSize: number;
  type?: string; // commercial | square
  status?: string; // up | down
  q?: string;
}

/** 分页结果通用结构 */
export interface ProductPageResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 顶部统计卡数据 */
export interface ProductStats {
  total: number;
  commercial: number;
  linked: number;
  riskHigh: number;
}

/** listProducts 所选 discovery 列对应的裸行 */
export type DiscoveryRowData = Pick<
  DiscoveriesRow,
  | 'id'
  | 'author_id'
  | 'type'
  | 'title'
  | 'note'
  | 'description'
  | 'commercial'
  | 'promo_type'
  | 'commission'
  | 'url'
  | 'reason'
  | 'created_at'
>;

/** listProducts 所选 square_posts 列对应的裸行 */
export type SquareRowData = Pick<
  SquarePostsRow,
  'id' | 'author_id' | 'content' | 'category' | 'url' | 'url_status' | 'created_at'
>;

/** 商品列表页 URL searchParams 形状（页面与筛选/客户端组件共用） */
export interface ProductPageParams {
  type?: string;
  status?: string;
  q?: string;
  page?: string;
}