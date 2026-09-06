import { requireAdmin } from '@/lib/auth';
import { listAuthData } from '@/modules/users';
import { AuthStats } from '@/modules/users/components/auth-stats';
import { AuthTabs, type AuthTab } from '@/modules/users/components/auth-tabs';
import { AuthClient } from '@/modules/users/components/auth-client';

export const dynamic = 'force-dynamic';

const validTabs: AuthTab[] = ['all', 'pending', 'approved', 'rejected'];

// 用户认证（RSC：统计卡服务端计算 + tab URL 筛选，零客户端 fetch）
export default async function UserAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  await requireAdmin();

  const data = await listAuthData();
  const tab: AuthTab = (params.tab as AuthTab) && validTabs.includes(params.tab as AuthTab) ? (params.tab as AuthTab) : 'all';

  const verifications = tab === 'all' ? data.verifications : data.verifications.filter((v) => v.status === tab);

  return (
    <div className="space-y-4">
      <AuthStats data={data} />
      <div className="rounded-lg border border-[#E5E6EB] bg-white">
        <div className="flex items-center justify-between border-b border-[#F0F1F3] px-5 py-3">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-[#1F2329]">认证申请审核</div>
          <AuthTabs current={tab} />
        </div>
        <AuthClient verifications={verifications} />
      </div>
    </div>
  );
}
