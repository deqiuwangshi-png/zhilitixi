import Link from 'next/link';
import { LineChart } from '@/components/charts/svg-charts';
import type { TrendPoint } from '@/modules/overview';

/** 举报趋势面板：range 切换走 URL searchParams（?range=7|30），图表复用 client 组件 */
export function TrendPanel({ range, data }: { range: '7' | '30'; data: TrendPoint[] }) {
  const empty = data.length === 0 || data.every((d) => d.value === 0);

  return (
    <div className="rounded-lg border border-[#E5E6EB] bg-white p-5 lg:col-span-3">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[#1F2329]">举报趋势</h3>
        <div className="flex overflow-hidden rounded-md border border-[#E5E6EB] text-xs">
          {(['7', '30'] as const).map((r) => (
            <Link
              key={r}
              href={r === '7' ? '/' : '/?range=30'}
              className={`px-3 py-1 transition-colors duration-150 ${
                range === r ? 'bg-[#006855] text-white' : 'bg-white text-[#646A73] hover:bg-[#F7F8FA]'
              }`}
            >
              近{r}天
            </Link>
          ))}
        </div>
      </div>
      <p className="mb-3 text-xs text-[#A0A6B0]">近{range}天举报量变化</p>
      {empty ? (
        <div className="flex h-[230px] items-center justify-center text-sm text-[#A0A6B0]">暂无举报数据</div>
      ) : (
        <LineChart data={data} />
      )}
    </div>
  );
}
