import type { AuthData } from '@/lib/repos/auth-repo';

/** 顶部 4 项统计卡（服务端计算） */
export function AuthStats({ data }: { data: AuthData }) {
  const pending = data.verifications.filter((v) => v.status === 'pending').length;
  const approved = data.verifications.filter((v) => v.status === 'approved').length;

  return (
    <div className="grid grid-cols-4 gap-4">
      <Stat label="认证申请" value={data.verifications.length} tone="text-[#1F2329]" />
      <Stat label="待审核" value={pending} tone="text-[#FF8800]" />
      <Stat label="已通过" value={approved} tone="text-[#00A870]" />
      <Stat label="注册用户" value={data.totalUsers} tone="text-[#1F2329]" />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border border-[#E5E6EB] bg-white p-5">
      <p className="text-[13px] text-[#646A73]">{label}</p>
      <p className={`mt-2 text-[28px] font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}
