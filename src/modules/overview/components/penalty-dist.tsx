import { BarChart } from '@/components/charts/svg-charts';
import type { PenaltyDistItem } from '@/modules/overview';

/** 处罚分布面板（按举报类别聚合柱状图） */
export function PenaltyDist({ data }: { data: PenaltyDistItem[] }) {
  return (
    <div className="rounded-lg border border-[#E5E6EB] bg-white p-5 lg:col-span-2">
      <h3 className="mb-1 text-[15px] font-semibold text-[#1F2329]">处罚分布</h3>
      <p className="mb-3 text-xs text-[#A0A6B0]">按举报类别聚合的处罚数量</p>
      {data.length ? (
        <BarChart data={data} />
      ) : (
        <div className="flex h-[230px] items-center justify-center text-sm text-[#A0A6B0]">暂无处罚数据</div>
      )}
    </div>
  );
}
