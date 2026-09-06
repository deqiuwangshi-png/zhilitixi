// 内容审核模块：领域类型定义。
// 字段与前端 ReviewTable / ReviewFilters 期望完全一致（与 content-repo 的
// ContentItem 同形，保持结构兼容，不改动任何组件），
// 三表（discoveries / square_posts / url_audit）合并为统一审核行。

/** 内容来源（三表合并标识） */
export type ReviewSource = 'discovery' | 'square' | 'url';

/** 归一化审核状态（数据库多态状态收敛） */
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

/** 内容列表行 DTO（与 ContentItem 同构，前端直接消费） */
export interface ReviewItem {
  id: string;
  source: ReviewSource;
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

/** 内容列表筛选 + 分页查询条件（服务端构造，数据库筛选分页） */
export interface ReviewListQuery {
  page: number;
  pageSize: number;
  status?: string;
  type?: string;
  category?: string;
  q?: string;
}

/** 分页结果通用结构 */
export interface ReviewPageResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 内容审核页 URL searchParams 形状（全部字符串，原样透传客户端 current） */
export interface ReviewPageParams {
  status?: string;
  type?: string;
  category?: string;
  q?: string;
  page?: string;
  size?: string;
}