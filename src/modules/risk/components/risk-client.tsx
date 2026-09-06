'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, Search, Trash2, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import type { UrlAuditRow, LinkDomainsRow, UploadAuditRow } from '@/lib/db-types';
import type { RiskTab } from './risk-tabs';
import { handleRiskAction } from '../actions';
import { RiskAddDrawer } from './risk-add-drawer';

const riskBadge: Record<string, string> = {
  low: 'bg-[#E6F7F0] text-[#00A870]',
  medium: 'bg-[#FFF4E6] text-[#FF8800]',
  high: 'bg-[#FDEBEA] text-[#D92D20]',
  safe: 'bg-[#E6F7F0] text-[#00A870]',
  blocked: 'bg-[#FDEBEA] text-[#D92D20]',
  trusted: 'bg-[#E8F5F1] text-[#006855]',
};

interface Props {
  tab: RiskTab;
  urlAudits: UrlAuditRow[];
  domains: LinkDomainsRow[];
  uploadAudits: UploadAuditRow[];
  userNames: Record<string, string>;
  q: string;
  page: number;
  totalPages: number;
}

/** 风控列表客户端容器：三 tab 列表 + 操作（SA）+ 新增抽屉 */
export function RiskClient({ tab, urlAudits, domains, uploadAudits, userNames, q, page, totalPages }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [showAdd, setShowAdd] = useState(false);
  const [kw, setKw] = useState(q);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const act = async (key: string, input: Parameters<typeof handleRiskAction>[0]) => {
    setBusyKey(key);
    const res = await handleRiskAction(input);
    setBusyKey(null);
    if (!res.ok) {
      alert(res.error || '操作失败');
      return;
    }
    router.refresh();
  };

  const remove = (type: 'domain' | 'url', idOrDomain: string) => {
    if (!window.confirm('确认删除该记录？此操作不可撤销。')) return;
    act(`${type}-${idOrDomain}`, type === 'domain' ? { type: 'domain', action: 'delete', domain: idOrDomain } : { type: 'url', action: 'delete', id: idOrDomain });
  };

  const goSearch = () => {
    const sp = new URLSearchParams(window.location.search);
    if (kw.trim()) sp.set('q', kw.trim());
    else sp.delete('q');
    sp.delete('page');
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const goPage = (p: number) => {
    const sp = new URLSearchParams(window.location.search);
    sp.set('page', String(p));
    router.push(`${pathname}?${sp.toString()}`);
  };

  const badgeText = (r: UrlAuditRow | LinkDomainsRow | UploadAuditRow) => {
    const row = r as UrlAuditRow & LinkDomainsRow & UploadAuditRow;
    if (row.kind === 'trusted') return '白名单';
    if (row.kind === 'blocked') return '黑名单';
    if (row.status === 'approved') return '已通过';
    if (row.status === 'rejected') return '已驳回';
    return row.risk || row.kind || row.status || '未知';
  };

  const badgeCls = (r: UrlAuditRow | LinkDomainsRow | UploadAuditRow) => {
    const row = r as UrlAuditRow & LinkDomainsRow & UploadAuditRow;
    const key = row.risk || row.kind || row.status || '';
    return riskBadge[key] || 'bg-[#EEF1F4] text-[#646A73]';
  };

  const list: (UrlAuditRow | LinkDomainsRow | UploadAuditRow)[] = tab === 'url' ? urlAudits : tab === 'domain' ? domains : uploadAudits;
  const showPage = tab === 'domain';

  return (
    <>
      {tab === 'domain' && (
        <div className="flex items-center gap-2 border-b border-[#F0F1F3] px-4 py-3">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-md bg-[#006855] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#005A4B]"
          >
            <Plus className="h-3.5 w-3.5" /> 新增域名
          </button>
          <div className="relative ml-auto w-64">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9AA0A6]" />
            <input
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') goSearch(); }}
              placeholder="搜索域名或备注"
              className="h-9 w-full rounded-md border border-[#E5E6EB] bg-white pl-8 pr-3 text-[13px] text-[#1F2329] outline-none placeholder:text-[#9AA0A6] focus:border-[#006855]"
            />
          </div>
        </div>
      )}

      <div className="p-0">
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#9AA0A6]">
            <Inbox className="h-10 w-10" />
            <p className="text-sm">暂无数据</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F0F1F3]">
            {list.map((raw) => {
              // 交叉类型收窄：三种行模型字段合并为超集，按 tab 分支访问
              const r = raw as UrlAuditRow & LinkDomainsRow & UploadAuditRow;
              const key = `${tab}-${r.id ?? r.domain}`;
              const title = r.url || r.domain || '内容';
              return (
                <div key={key} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[#F8FAFC]">
                  <div className="min-w-0 flex-1">
                    <span className="truncate font-mono text-[13px] font-medium text-[#1F2329]">{title}</span>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-[#646A73]">
                      {r.note && <span>{r.note}</span>}
                      {r.user_id && <span>· 用户：{userNames[r.user_id] || '用户'}</span>}
                      {tab === 'url' && r.host && <span>· {r.host}</span>}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] ${badgeCls(r)}`}>{badgeText(r)}</span>
                  <div className="flex shrink-0 gap-1.5">
                    {tab === 'domain' ? (
                      <>
                        <button
                          onClick={() => act(`${key}-switch`, { type: 'domain', action: 'upsert', domain: r.domain, kind: r.kind === 'trusted' ? 'blocked' : 'trusted', note: r.note ?? '' })}
                          disabled={busyKey === `${key}-switch`}
                          className="rounded-md border border-[#E5E6EB] px-2.5 py-1.5 text-[12px] text-[#00A870] transition-colors hover:bg-[#E6F7F0] disabled:opacity-40"
                        >
                          {r.kind === 'blocked' ? '移入白名单' : '移入黑名单'}
                        </button>
                        <button onClick={() => remove('domain', r.domain)} className="flex items-center gap-1 rounded-md border border-[#E5E6EB] px-2.5 py-1.5 text-[12px] text-[#F54A45] transition-colors hover:bg-[#FDEBEA]">
                          <Trash2 className="h-3 w-3" /> 删除
                        </button>
                      </>
                    ) : tab === 'url' ? (
                      <>
                        <button
                          onClick={() => act(`${key}-pass`, { type: 'url', action: 'approve', id: r.id, risk: 'safe' })}
                          disabled={busyKey === `${key}-pass`}
                          className="rounded-md border border-[#E5E6EB] px-2.5 py-1.5 text-[12px] text-[#00A870] transition-colors hover:bg-[#E6F7F0] disabled:opacity-40"
                        >
                          放行
                        </button>
                        <button
                          onClick={() => act(`${key}-ban`, { type: 'url', action: 'reject', id: r.id, risk: 'high' })}
                          disabled={busyKey === `${key}-ban`}
                          className="rounded-md border border-[#E5E6EB] px-2.5 py-1.5 text-[12px] text-[#F54A45] transition-colors hover:bg-[#FDEBEA] disabled:opacity-40"
                        >
                          封禁
                        </button>
                        <button onClick={() => remove('url', String(r.id))} className="rounded-md border border-[#E5E6EB] px-2.5 py-1.5 text-[12px] text-[#F54A45] transition-colors hover:bg-[#FDEBEA]">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => act(`${key}-approve`, { type: 'upload', action: 'approve', id: r.id })}
                          disabled={busyKey === `${key}-approve`}
                          className="rounded-md border border-[#E5E6EB] px-2.5 py-1.5 text-[12px] text-[#00A870] transition-colors hover:bg-[#E6F7F0] disabled:opacity-40"
                        >
                          通过
                        </button>
                        <button
                          onClick={() => act(`${key}-reject`, { type: 'upload', action: 'reject', id: r.id })}
                          disabled={busyKey === `${key}-reject`}
                          className="rounded-md border border-[#E5E6EB] px-2.5 py-1.5 text-[12px] text-[#F54A45] transition-colors hover:bg-[#FDEBEA] disabled:opacity-40"
                        >
                          驳回
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showPage && list.length > 0 && (
        <div className="flex items-center justify-between border-t border-[#F0F1F3] px-4 py-3 text-[12px] text-[#646A73]">
          <span>共 {list.length} 条</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => goPage(page - 1)} className="rounded-md border border-[#E5E6EB] px-2.5 py-1 transition-colors hover:bg-[#F7F8FA] disabled:opacity-40">
              上一页
            </button>
            <span className="tabular-nums">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => goPage(page + 1)} className="rounded-md border border-[#E5E6EB] px-2.5 py-1 transition-colors hover:bg-[#F7F8FA] disabled:opacity-40">
              下一页
            </button>
          </div>
        </div>
      )}

      {showAdd && <RiskAddDrawer onClose={() => setShowAdd(false)} />}
    </>
  );
}
