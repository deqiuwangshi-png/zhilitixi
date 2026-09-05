// 风控中心仓储层：URL 巡检 / 域名黑白名单 / 上传审核 三数据源 + 风控操作。
// TODO(阶段六): listRiskData 已迁移至 src/modules/risk/risk.queries.ts（domain tab 改为
// DB 级 count+order+range 分页检索，q 下沉到 WHERE，不再全量 limit(500)+内存 filter+slice），
// 写操作经 commands 复用本文件的 applyRiskAction。以下导出保留供旧前端组件（从
// @/lib/repos/risk-repo 引用 RiskData）兼容，勿删仍被引用的导出。
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import type { UrlAuditRow, LinkDomainsRow, UploadAuditRow } from '@/lib/db-types';

export interface RiskData {
  urlAudits: UrlAuditRow[];
  domains: LinkDomainsRow[];
  uploadAudits: UploadAuditRow[];
  userNames: Record<string, string>;
}

/** 三数据源并行查询（含上传审核，修复原 API 缺失字段） */
export async function listRiskData(): Promise<RiskData> {
  const client = getSupabasePrivilegedClient();
  const [{ data: urlAudits }, { data: domains }, { data: uploadAudits }] = await Promise.all([
    client.from('url_audit').select('*').order('created_at', { ascending: false }).limit(200),
    client.from('link_domains').select('*').order('created_at', { ascending: true }).limit(500),
    client.from('upload_audit').select('*').order('created_at', { ascending: false }).limit(100),
  ]);
  const urlRows: UrlAuditRow[] = urlAudits ?? [];

  const userIds = new Set(urlRows.map((r) => r.user_id).filter((x): x is string => !!x));
  const userNames: Record<string, string> = {};
  if (userIds.size) {
    const { data: users } = await client.from('users').select('id,name').in('id', Array.from(userIds));
    for (const u of users ?? []) userNames[u.id] = u.name ?? '';
  }

  return { urlAudits: urlRows, domains: domains ?? [], uploadAudits: uploadAudits ?? [], userNames };
}

export interface RiskActionInput {
  type: 'domain' | 'url' | 'upload';
  action: 'upsert' | 'delete' | 'approve' | 'reject';
  domain?: string;
  kind?: 'trusted' | 'blocked';
  note?: string;
  id?: string | number;
  risk?: 'safe' | 'high';
}

/** 风控操作：域名增删/切换、URL 放行封禁删除、上传审核（补上原缺失的 upload 分支） */
export async function applyRiskAction(input: RiskActionInput): Promise<void> {
  const client = getSupabasePrivilegedClient();
  const { type, action } = input;

  if (type === 'domain') {
    if (action === 'delete' && input.domain) {
      const { error } = await client.from('link_domains').delete().eq('domain', input.domain);
      if (error) throw new Error(`delete domain failed: ${error.message}`);
    } else if (action === 'upsert' && input.domain) {
      const exists = await client.from('link_domains').select('domain').eq('domain', input.domain).maybeSingle();
      if (exists.error) throw new Error(`upsert domain failed: ${exists.error.message}`);
      if (exists.data) {
        const { error } = await client
          .from('link_domains')
          .update({ kind: input.kind, note: input.note ?? '' })
          .eq('domain', input.domain);
        if (error) throw new Error(`upsert domain failed: ${error.message}`);
      } else {
        const { error } = await client.from('link_domains').insert({
          domain: input.domain,
          kind: input.kind ?? 'trusted',
          note: input.note ?? '',
        });
        if (error) throw new Error(`upsert domain failed: ${error.message}`);
      }
    }
    return;
  }

  if (type === 'url') {
    const id = Number(input.id);
    if (action === 'delete') {
      const { error } = await client.from('url_audit').delete().eq('id', id);
      if (error) throw new Error(`delete url failed: ${error.message}`);
    } else if (input.risk) {
      const { error } = await client.from('url_audit').update({ risk: input.risk }).eq('id', id);
      if (error) throw new Error(`update url failed: ${error.message}`);
    }
    return;
  }

  if (type === 'upload') {
    // 通过/驳回：写回 upload_audit.status（修复原 API 无此分支）
    const status = action === 'approve' ? 'approved' : 'rejected';
    const { error } = await client
      .from('upload_audit')
      .update({ status })
      .eq('id', Number(input.id));
    if (error) throw new Error(`update upload failed: ${error.message}`);
  }
}
