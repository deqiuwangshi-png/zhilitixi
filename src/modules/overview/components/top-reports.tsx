import type { TopReport } from '@/modules/overview';

const reasonColor: Record<string, string> = {
  重复: 'bg-[#FFF3E6] text-[#FF8800]',
  垃圾内容: 'bg-[#E8F5F1] text-[#006855]',
  广告: 'bg-[#E8F5F1] text-[#006855]',
  广告骚扰: 'bg-[#E8F5F1] text-[#006855]',
  违规推广: 'bg-[#FFEBEC] text-[#F54A45]',
  侵权: 'bg-[#FFEBEC] text-[#F54A45]',
  人身攻击: 'bg-[#FFEBEC] text-[#F54A45]',
  违法信息: 'bg-[#FDECEC] text-[#D92D20]',
  其他: 'bg-[#F1F2F5] text-[#646A73]',
};

/** 待处理举报 TOP10 */
export function TopReports({ items }: { items: TopReport[] }) {
  return (
    <div className="rounded-lg border border-[#E5E6EB] bg-white p-5 lg:col-span-3">
      <h3 className="mb-3 text-[15px] font-semibold text-[#1F2329]">待处理举报 TOP10</h3>
      {items.length ? (
        <ul className="divide-y divide-[#F1F2F5]">
          {items.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-3">
              <span className="shrink-0 font-mono text-[13px] font-medium text-[#1F2329]">{r.no}</span>
              <span className={`shrink-0 rounded px-2 py-0.5 text-xs ${reasonColor[r.reason] || reasonColor['其他']}`}>
                {r.reason}
              </span>
              <span className="flex-1 truncate text-sm text-[#646A73]">
                {r.target_type === 'comment' ? '评论' : '市集帖子'} · {r.reporter_name}
              </span>
              <span className="shrink-0 text-xs text-[#A0A6B0]">{r.time}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex h-40 items-center justify-center text-sm text-[#A0A6B0]">暂无待处理举报</div>
      )}
    </div>
  );
}
