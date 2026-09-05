// 风控中心模块：行归一化映射。
// urlAudits/domains/uploadAudits 直接使用 db-types 裸行（组件原样消费），本层提供
// 列表结果行数组的归一化（null → 空数组），供 queries 统一落地，消除散落的 ?? []。

/** 将可选数组归一化为数组（null/undefined → 空数组） */
export function toRows<T>(data: T[] | null | undefined): T[] {
  return data ?? [];
}