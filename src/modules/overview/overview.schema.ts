// 治理总览模块：输入校验。
// 总览为纯只读聚合页，唯一 searchParams 为趋势区间 range（7 | 30）。
import { z } from 'zod';

/** 趋势区间 URL 校验：仅接受 '7' 或 '30'，其余回退 '7' */
export const overviewRangeSchema = z.object({
  range: z.enum(['7', '30']).optional(),
});

/** 页面 searchParams 入参形状（原始字符串） */
export type OverviewRangeInput = { range?: string };

/** 区间收敛：非法/缺失回退 '7' */
export function toOverviewRange(input: OverviewRangeInput): '7' | '30' {
  return input.range === '30' ? '30' : '7';
}