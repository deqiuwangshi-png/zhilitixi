// 风控中心模块：对外唯一出口（显式导出，禁止 export *）。
// 导出范围：页面需要的读函数、授权入口、列表查询 schema，以及对外 DTO 类型。
// 不导出：mapper（内部实现）、applyRisk（只经 actions.ts 调用）、schema 内部常量。
export type { RiskData, RiskListData, RiskListQuery, RiskTab } from './risk.types';
export { listRiskData } from './risk.queries';
export { requireRiskRead } from './risk.policy';
export { riskListQuerySchema, toRiskListQuery } from './risk.schema';
