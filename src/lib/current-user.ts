/**
 * 治理后台当前登录操作者身份。
 *
 * 本期认证体系以「单一后台管理员」模式运行：
 * - 通过环境变量 `GOVERNANCE_ADMIN_USER_ID` 指定当前登录用户；
 * - 未配置时，默认取主库真实用户（「往事」，email 登录，具备可修改密码的凭证）。
 *
 * 后续接入正式登录页后，可替换为从会话中解析出的用户 id。
 */
export const CURRENT_USER_ID =
  process.env.GOVERNANCE_ADMIN_USER_ID ||
  '82fbbe38-dc2f-4622-974f-46ae085ddad7';

/**
 * 退出登录后跳转的官网首页地址（占位，便于后续替换为真实官网）。
 * 使用 NEXT_PUBLIC 前缀以便在客户端读取。
 */
export const SITE_HOME_URL =
  process.env.NEXT_PUBLIC_SITE_HOME_URL || 'https://www.gravity-governance.cn';