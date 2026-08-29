import { PackageSearch, Link2, AlertTriangle } from 'lucide-react';
import type { ProductStats } from '@/lib/repos/product-repo';

const cards = [
  { key: 'total', label: '商品总数', icon: PackageSearch, tone: 'text-[#006855]' },
  { key: 'commercial', label: '商业化内容', icon: Link2, tone: 'text-[#006855]' },
  { key: 'linked', label: '带链接帖子', icon: Link2, tone: 'text-[#006855]' },
  { key: 'riskHigh', label: '高风险', icon: AlertTriangle, tone: 'text-[#F54A45]' },
] as const;

/** 顶部统计卡（服务端计算） */
export function ProductStats({ stats }: { stats: ProductStats }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((s) => {
        const Icon = s.icon;
        const value = stats[s.key] ?? 0;
        return (
          <div key={s.key} className="rounded-lg border border-[#E5E6EB] bg-white">
            <div className="flex items-center justify-between p-5">
              <div>
                <p className="text-[13px] text-[#646A73]">{s.label}</p>
                <p className={`mt-2 text-[28px] font-bold tabular-nums ${s.key === 'riskHigh' ? 'text-[#F54A45]' : 'text-[#1F2329]'}`}>
                  {value}
                </p>
              </div>
              <Icon className={`h-5 w-5 ${s.tone}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
