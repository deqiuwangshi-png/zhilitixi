import { requireAdmin } from '@/lib/auth';
import { listRules } from '@/lib/repos/rule-repo';
import { DomainManager } from '@/components/features/rules/domain-manager';
import { ViolationsList } from '@/components/features/rules/violations-list';

export const dynamic = 'force-dynamic';

// 规则与处罚（RSC：服务端直查，域名操作走 Server Actions）
export default async function RulesPage() {
  await requireAdmin();
  const data = await listRules();

  return (
    <div className="space-y-4">
      <DomainManager domains={data.domains} />
      <ViolationsList data={data} />
    </div>
  );
}
