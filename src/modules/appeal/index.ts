// 侵权与申诉模块：对外唯一出口（显式导出，禁止 export *）。
// 导出范围：页面需要的读函数、授权入口，以及对外 DTO 类型。
// 不导出：mapper（内部实现）、applyAppeal（只经 actions.ts 调用）、schema 内部常量。
export type { AppealItem, AppealSource } from './appeal.types';
export { listAppeals } from './appeal.queries';
export { requireAppealRead } from './appeal.policy';
