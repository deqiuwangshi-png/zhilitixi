// 规则与处罚模块：对外唯一出口（显式导出，禁止 export *）。
// 导出范围：页面需要的读函数、授权入口，以及对外 DTO 类型。
// 不导出：mapper（内部实现）、applyRule（只经 actions.ts 调用）、schema 内部常量。
export type { RuleData } from './rules.types';
export { listRules } from './rules.queries';
export { requireRuleManage } from './rules.policy';
