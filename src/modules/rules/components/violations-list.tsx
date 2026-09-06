import type { RuleData } from '../rules.types';

/** 违规处罚记录（服务端直查展示） */
export function ViolationsList({ data }: { data: RuleData }) {
  return (
    <div className="rounded-lg border border-[#E5E6EB] bg-white">
      <div className="border-b border-[#F0F1F3] px-4 py-3">
        <span className="text-[15px] font-semibold text-[#1F2329]">违规处罚记录</span>
      </div>
      {data.violations.length === 0 ? (
        <p className="p-6 text-sm text-[#646A73]">暂无违规记录</p>
      ) : (
        <div className="divide-y divide-[#F0F1F3]">
          {data.violations.map((v) => (
            <div key={v.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[#F8FAFC]">
              <span className="flex-1 truncate font-mono text-[13px] text-[#1F2329]">{v.url}</span>
              <span className="text-xs text-[#646A73]">用户：{data.userNames[v.user_id ?? ''] || '用户'}</span>
              <span className="rounded bg-[#FDEBEA] px-1.5 py-0.5 text-[11px] text-[#D92D20]">
                {v.risk === 'high' ? '高风险' : v.risk || '风险'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
