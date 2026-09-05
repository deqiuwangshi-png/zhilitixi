// 手写 Supabase Database 类型（治理后台用到的 public schema 核心表）。
// 依据 2026-08-25 实测表结构 + 迁移 001 新增的治理列。
// 注意：必须使用 type alias（非 interface），否则不满足 supabase-js
// GenericTable 的 Record<string, unknown> 约束，泛型会退化为 never。
// 用途：让 supabase-js 查询获得列名/返回类型校验，替代散落的 any。

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ---------- users（含治理字段，001 迁移） ----------
export type UsersRow = {
  id: string; // uuid
  name: string | null;
  bio: string | null;
  avatar_url: string | null;
  points: number | null;
  created_at: string | null;
  cover_url: string | null;
  badge: string | null;
  gov_status: string | null; // normal | limited | banned
  gov_role: string | null; // user | moderator
  anomaly: string | null;
  penalty_count: number | null;
  ban_until: string | null; // timestamptz
  rate_limit_until: string | null; // timestamptz
  is_admin: boolean | null;
};

// ---------- governance_penalties（001 迁移，处罚流水） ----------
export type GovernancePenaltiesRow = {
  id: string; // uuid
  user_id: string; // uuid
  action: string; // ban | limit | unban | unlimit | role_change | edit
  reason: string | null;
  operator_id: string | null; // uuid
  detail: Json | null;
  created_at: string | null; // timestamptz
};

// ---------- reports ----------
export type ReportsRow = {
  id: string;
  reporter_id: string | null; // uuid
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  status: string | null;
  created_at: string | null;
};

// ---------- discoveries ----------
export type DiscoveriesRow = {
  id: string;
  author_id: string | null; // uuid
  type: string | null;
  title: string | null;
  note: string | null;
  description: string | null;
  source: string | null;
  origin: string | null;
  tags: string[] | null;
  commercial: boolean | null;
  promo_type: string | null;
  commission: string | null;
  url: string | null;
  kind: string | null;
  media_url: string | null;
  reason: string | null;
  review_status: string | null; // pending | approved | rejected（005 迁移）
  views: number | null;
  likes_count: number | null;
  comments_count: number | null;
  created_at: string | null;
};

// ---------- square_posts ----------
export type SquarePostsRow = {
  id: string;
  author_id: string | null; // uuid
  content: string | null;
  tags: string[] | null;
  url: string | null;
  views: number | null;
  likes_count: number | null;
  comments_count: number | null;
  created_at: string | null;
  image_url: string | null;
  category: string | null;
  post_type: string | null;
  commission: string | null;
  source_platform: string | null;
  url_status: string | null;
  review_status: string | null; // pending | approved | rejected（005 迁移）
};

// ---------- url_audit ----------
export type UrlAuditRow = {
  id: number;
  url: string | null;
  host: string | null;
  risk: string | null;
  user_id: string | null; // uuid
  created_at: string | null;
};

// ---------- verifications ----------
export type VerificationsRow = {
  id: string;
  user_id: string | null; // uuid
  vtype: string | null;
  statement: string | null;
  status: string | null;
  created_at: string | null;
};

// ---------- upload_audit ----------
export type UploadAuditRow = {
  id: number;
  user_id: string | null; // uuid
  target: string | null;
  bucket: string | null;
  path: string | null;
  bytes: number | null;
  status: string | null;
  created_at: string | null;
};

// ---------- comments ----------
export type CommentsRow = {
  id: string;
  author_id: string | null; // uuid
  target_type: string | null;
  target_id: string | null;
  content: string | null;
  likes: number | null;
  created_at: string | null;
  parent_id: string | null;
};

// ---------- link_domains ----------
export type LinkDomainsRow = {
  domain: string;
  kind: string | null;
  note: string | null;
  created_at: string | null;
};

// ---------- notifications ----------
export type NotificationsRow = {
  id: string; // uuid
  user_id: string; // uuid
  type: string | null;
  actor_id: string | null; // uuid
  target_type: string | null;
  item_id: string | null;
  title: string | null;
  content: string | null;
  read: boolean | null;
  created_at: string | null;
};

// ---------- announcements ----------
export type AnnouncementsRow = {
  id: string;
  kind: string | null;
  icon: string | null;
  title: string | null;
  description: string | null;
  link: string | null;
  image_url: string | null;
  sort: number | null;
  active: boolean | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string | null;
};

// ---------- 轻量关系表 ----------
export type LikesRow = {
  user_id: string; // uuid
  target_type: string;
  target_id: string;
  created_at: string | null;
};
export type CommentLikesRow = {
  user_id: string; // uuid
  comment_id: string;
  created_at: string | null;
};
export type FavoritesRow = {
  user_id: string; // uuid
  discovery_id: string;
  created_at: string | null;
};
export type FollowsRow = {
  follower_id: string; // uuid
  following_id: string; // uuid
  created_at: string | null;
};
export type ViewEventsRow = {
  id: string; // uuid
  user_id: string | null; // uuid
  target_type: string | null;
  target_id: string | null;
  created_at: string | null;
};

type TableDef<T extends Record<string, unknown>> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};

// ---------- 008 迁移：跨表合并统一列表的只读视图 ----------
// v_product_catalog：discoveries（商业化内容）∪ square_posts（带链接帖子）
export type ProductCatalogViewRow = {
  id: string;
  src: string; // 'discovery' | 'square'
  author_id: string | null;
  created_at: string | null;
  note: string | null;
  title: string | null;
  description: string | null;
  content_type: string | null; // discoveries.type
  commercial: boolean | null;
  promo_type: string | null;
  commission: string | null;
  url: string | null;
  reason: string | null; // discoveries.reason（square 侧复用 url_status）
  content: string | null; // square_posts.content
  category: string | null; // square_posts.category
  url_status: string | null; // square_posts.url_status
  down_flag: boolean; // 归一化下架标记
  search_text: string | null; // 归一化可检索拼接
};

// v_content_review_catalog：discoveries ∪ square_posts ∪ url_audit
export type ContentReviewCatalogViewRow = {
  id: string;
  src: string; // 'discovery' | 'square' | 'url'
  author_id: string | null;
  created_at: string | null;
  title: string | null;
  note: string | null;
  description: string | null;
  content: string | null; // square_posts.content
  media_url: string | null; // discoveries.media_url
  image_url: string | null; // square_posts.image_url
  type: string | null; // discoveries.type
  category: string | null; // square_posts.category
  review_status: string | null; // discoveries/square_posts.review_status
  reason: string | null; // discoveries.reason
  url_status: string | null; // square_posts.url_status
  url: string | null; // url_audit.url
  host: string | null; // url_audit.host
  risk: string | null; // url_audit.risk
  views: number | null;
  url_id: number | null; // url_audit.id（int8 → number）
  author_name: string | null; // 联表用户名
  norm_status: string; // 归一化审核状态 pending/approved/rejected
  norm_category: string; // 归一化分类（含默认值）
  search_text: string | null; // 归一化可检索拼接
};

export interface Database {
  public: {
    Tables: {
      users: TableDef<UsersRow>;
      governance_penalties: TableDef<GovernancePenaltiesRow>;
      reports: TableDef<ReportsRow>;
      discoveries: TableDef<DiscoveriesRow>;
      square_posts: TableDef<SquarePostsRow>;
      url_audit: TableDef<UrlAuditRow>;
      verifications: TableDef<VerificationsRow>;
      upload_audit: TableDef<UploadAuditRow>;
      comments: TableDef<CommentsRow>;
      link_domains: TableDef<LinkDomainsRow>;
      notifications: TableDef<NotificationsRow>;
      announcements: TableDef<AnnouncementsRow>;
      likes: TableDef<LikesRow>;
      comment_likes: TableDef<CommentLikesRow>;
      favorites: TableDef<FavoritesRow>;
      follows: TableDef<FollowsRow>;
      view_events: TableDef<ViewEventsRow>;
    };
    Views: {
      v_product_catalog: {
        Row: ProductCatalogViewRow;
        Relationships: [];
      };
      v_content_review_catalog: {
        Row: ContentReviewCatalogViewRow;
        Relationships: [];
      };
    };
    Functions: {
      list_user_sessions: {
        Args: { uid: string };
        Returns: { id: string; user_agent: string; created_at: string; updated_at: string }[];
      };
      revoke_user_session: {
        Args: { uid: string; sid: string };
        Returns: undefined;
      };
      revoke_all_user_sessions: {
        Args: { uid: string };
        Returns: undefined;
      };
      bump_views: {
        Args: { target_type: string; target_id: string };
        Returns: undefined;
      };
      get_my_points: {
        Args: Record<string, never>;
        Returns: number;
      };
      rls_auto_enable: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      apply_governance_action: {
        Args: {
          p_user_id: string;
          p_action: string;
          p_reason?: string;
          p_operator_id?: string | null;
          p_request_id?: string | null;
          p_occurred_at?: string;
        };
        Returns: unknown;
      };
    };
    Enums: Record<string, never>;
  };
}
