import { requireRuleManage, listRules } from '@/modules/rules';
import { DomainManager } from '@/modules/rules/components/domain-manager';
import { ViolationsList } from '@/modules/rules/components/violations-list';

export const dynamic = 'force-dynamic';

// 规则与处罚（RSC：服务端直查，域名操作走 Server Actions；复用 rule.manage 权限点）
export default async function RulesPage() {
  await requireRuleManage();
  const data = await listRules();

  return (
    <div className="space-y-4">
      <DomainManager domains={data.domains} />
      <ViolationsList data={data} />
    </div>
  );
}
