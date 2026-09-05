// 举报处理模块：行归一化映射（从旧 report-repo 迁移，字段与 ReportItem 完全一致）。
import type {
  ContentTypeFn,
  ReasonFn,
  ReportItem,
  ReportListRow,
  ReportNoFn,
  ReportStatus,
  RowToDtoContext,
  StatusFn,
} from './report.types';

/** 内容类型归一化：原始 target_type → 中文文案 */
export const contentTypeMap: Record<string, string> = {
  comment: '评论',
  review: '评论',
  square: '帖子',
  post: '帖子',
  discovery: '帖子',
  user: '用户',
};

/** 举报理由归一化：原始 reason → 中文文案 */
export const reasonMap: Record<string, string> = {
  垃圾广告: '垃圾广告',
  垃圾内容: '垃圾广告',
  spam: '垃圾广告',
  色情内容: '色情内容',
  pornography: '色情内容',
  冒充他人: '冒充他人',
  impersonation: '冒充他人',
  政治敏感: '政治敏感',
  政治: '政治敏感',
  人身攻击: '人身攻击',
  harassment: '人身攻击',
  违规推广: '违规推广',
  侵权: '侵权',
  重复: '重复',
  违法信息: '违法信息',
};

/** 状态归一化：多态数据库状态 → ReportStatus（与旧实现一致） */
export const normStatus: StatusFn = (raw) => {
  const t = (raw ?? 'pending').toLowerCase();
  if (t === 'approved' || t === 'resolved' || t === 'normal') return 'approved';
  if (t === 'rejected' || t === 'ignored' || t === 'blocked') return 'rejected';
  return 'pending';
};

/** 内容类型归一化（包装 contentTypeMap） */
export const contentType: ContentTypeFn = (raw) => contentTypeMap[raw] || raw || '评论';

/** 举报理由归一化（包装 reasonMap） */
export const reason: ReasonFn = (raw) => reasonMap[raw] || raw || '垃圾广告';

/** 数字左补零 */
export function pad(n: number, size = 3): string {
  return String(n).padStart(size, '0');
}

/** 举报编号生成：RPT-YYYYMMDD-序号 */
export const generateReportNo: ReportNoFn = (createdAt, index) => {
  const date = (createdAt ?? '').slice(0, 10).replace(/-/g, '');
  return `RPT-${date || '00000000'}-${pad(index + 1)}`;
};

/** 非用户目标的名称展示：长 id 截断 */
export function humanTarget(row: ReportListRow): string {
  if (!row.target_id) return '未知';
  return String(row.target_id).length > 20
    ? String(row.target_id).slice(0, 16) + '…'
    : String(row.target_id);
}

/**
 * 单个数据库行 → ReportItem DTO。
 * - index：当前页内序号（用于编号展示）。
 * - ctx：queries 在页内构建的用户名映射与重复统计；缺省时回退兜底。
 */
export function rowToDto(row: ReportListRow, index: number, ctx: RowToDtoContext = {}): ReportItem {
  const userNames = ctx.userNames ?? {};
  const repeatMap = ctx.repeatMap ?? {};
  const tid = row.target_id ?? '';
  return {
    id: row.id,
    reportNo: generateReportNo(row.created_at, index),
    status: normStatus(row.status),
    contentType: contentType(row.target_type ?? ''),
    reason: reason(row.reason ?? ''),
    reporterName: userNames[row.reporter_id ?? ''] || '未知',
    targetName:
      row.target_type === 'user'
        ? userNames[tid] || (tid ? String(tid).slice(0, 16) : '未知')
        : humanTarget(row),
    targetId: row.target_id,
    repeatCount: repeatMap[tid] ?? 1,
    createdAt: row.created_at,
  };
}