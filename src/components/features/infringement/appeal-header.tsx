import { Scale } from 'lucide-react';
import type { AppealItem } from '@/lib/repos/appeal-repo';

/** 顶部：统计卡 + 模块说明横幅 */
export function AppealHeader({ items }: { items: AppealItem[] }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="rounded-lg border border-[#E5E6EB] bg-white p-5">
        <p className="text-[13px] text-[#646A73]">侵权/违规内容</p>
        <p className="mt-2 text-[28px] font-bold tabular-nums text-[#F54A45]">{items.length}</p>
      </div>
      <div className="col-span-3 rounded-lg border border-[#E5E6EB] bg-white">
        <div className="flex h-full items-center gap-3 p-5">
          <Scale className="h-5 w-5 text-[#006855]" />
          <p className="text-[13px] text-[#646A73]">
            侵权与申诉模块：处理被标记的侵权/违规内容，核实后可根据创作者申诉恢复发布。所有申诉处理将记录到系统日志。
          </p>
        </div>
      </div>
    </div>
  );
}
