'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Shield, Trash2 } from 'lucide-react';
import type { LinkDomainsRow } from '@/lib/db-types';
import { handleRuleAction } from '@/lib/actions/rule-actions';

/** 域名规则管理（输入框 + 加名单 + 列表切换/删除，操作走 Server Action） */
export function DomainManager({ domains }: { domains: LinkDomainsRow[] }) {
  const router = useRouter();
  const [newDomain, setNewDomain] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const act = async (key: string, input: Parameters<typeof handleRuleAction>[0]) => {
    setBusyKey(key);
    const res = await handleRuleAction(input);
    setBusyKey(null);
    if (!res.ok) {
      alert(res.error || '操作失败');
      return;
    }
    router.refresh();
  };

  const addDomain = (kind: 'trusted' | 'blocked') => {
    if (!newDomain.trim()) return;
    act(`add-${newDomain.trim()}`, { action: 'addDomain', domain: newDomain.trim(), kind, note: '' });
    setNewDomain('');
  };

  return (
    <div className="rounded-lg border border-[#E5E6EB] bg-white">
      <div className="flex items-center gap-2 border-b border-[#F0F1F3] px-4 py-3">
        <Shield className="h-4 w-4 text-[#006855]" />
        <span className="text-[15px] font-semibold text-[#1F2329]">域名规则管理</span>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2">
          <input
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addDomain('trusted'); }}
            placeholder="输入域名，如 example.com"
            className="flex-1 rounded-md border border-[#E5E6EB] bg-white px-3 py-2 text-[13px] font-mono text-[#1F2329] outline-none transition-colors focus:border-[#006855]"
          />
          <button
            onClick={() => addDomain('trusted')}
            className="flex h-9 shrink-0 items-center gap-1 rounded-md bg-[#006855] px-4 text-[13px] text-white transition-colors hover:bg-[#005547]"
          >
            <Plus className="h-4 w-4" /> 加白名单
          </button>
          <button
            onClick={() => addDomain('blocked')}
            className="flex h-9 shrink-0 items-center gap-1 rounded-md bg-[#D92D20] px-4 text-[13px] text-white transition-colors hover:bg-[#b6261a]"
          >
            <Plus className="h-4 w-4" /> 加黑名单
          </button>
        </div>

        {domains.length === 0 ? (
          <p className="mt-4 py-6 text-center text-sm text-[#646A73]">暂无域名规则</p>
        ) : (
          <div className="mt-4 divide-y divide-[#F0F1F3]">
            {domains.map((d) => (
              <div key={d.domain} className="flex items-center gap-3 py-3 transition-colors hover:bg-[#F8FAFC]">
                <span className="flex-1 font-mono text-[13px] text-[#1F2329]">{d.domain}</span>
                <span className={`rounded px-1.5 py-0.5 text-[11px] ${d.kind === 'trusted' ? 'bg-[#E8F5F1] text-[#006855]' : 'bg-[#FDEBEA] text-[#D92D20]'}`}>
                  {d.kind === 'trusted' ? '白名单' : '黑名单'}
                </span>
                {d.note && <span className="text-xs text-[#646A73]">{d.note}</span>}
                <button
                  onClick={() => act(`toggle-${d.domain}`, { action: 'toggleDomain', domain: d.domain })}
                  disabled={busyKey === `toggle-${d.domain}`}
                  className="rounded-md border border-[#E5E6EB] px-2.5 py-1.5 text-[12px] text-[#646A73] transition-colors hover:bg-[#F7F8FA] disabled:opacity-40"
                >
                  切换
                </button>
                <button
                  onClick={() => {
                    if (!window.confirm(`确认删除域名「${d.domain}」？`)) return;
                    act(`del-${d.domain}`, { action: 'deleteDomain', domain: d.domain });
                  }}
                  disabled={busyKey === `del-${d.domain}`}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[#646A73] transition-colors hover:bg-[#FDEBEA] hover:text-[#F54A45] disabled:opacity-40"
                  aria-label="删除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
