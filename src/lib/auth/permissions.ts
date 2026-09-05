// 权限名称与角色类型集中定义。
// 约定权限表达式为 `resource.action`，后续迁移到 roles/permissions 模型后，本文件保持为唯一定义点。

export const Permissions = {
  // 举报处理
  reportRead: 'report.read',
  reportApprove: 'report.approve',
  reportReject: 'report.reject',
  // 内容审核
  reviewApply: 'review.apply',
  // 用户治理
  userRead: 'user.read',
  userEdit: 'user.edit',
  userBan: 'user.ban',
  // 规则管理
  ruleManage: 'rule.manage',
  // 活动管理
  activityRead: 'activity.read',
  activityManage: 'activity.manage',
  // 商品治理
  productRead: 'product.read',
  productManage: 'product.manage',
  // 侵权与申诉
  appealRead: 'appeal.read',
  appealManage: 'appeal.manage',
  // 风控中心
  riskRead: 'risk.read',
  riskManage: 'risk.manage',
  // 规则与处罚（复用 rule.manage，无独立读写拆分）
  // 治理总览（纯只读）
  overviewRead: 'overview.read',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

/** 当前支持的全部权限。后续接入角色/权限表后，由数据库返回，不再用全量数组兜底。 */
export const ALL_PERMISSIONS: readonly Permission[] = Object.values(Permissions);