// 风控中心模块：命令层（写操作）。
// 授权 → zod 校验 → 落库（service-role），失败抛稳定 AuthError（不暴露 Supabase 原始错误）。
// 支持：域名增删/切换、URL 放行封禁删除、上传审核通过/驳回。
import { AuthError, AUTH_ERROR_CODES } from '@/lib/auth/errors';
import { getSupabasePrivilegedClient } from '@/storage/database/supabase-client';
import { requireRiskManage } from './risk.policy';
import { riskActionSchema, type RiskActionInput } from './risk.schema';

/**
 * 风控操作：risk.manage + 校验 + 落库。
 * - domain.upsert：存在则更新 kind/note，否则插入（白名单/黑名单）
 * - domain.delete：按域名删除
 * - url.approve/reject：写回 url_audit.risk（safe/high）
 * - url.delete：删除审计行
 * - upload.approve/reject：写回 upload_audit.status
 */
export async function applyRisk(input: RiskActionInput): Promise<void> {
  await requireRiskManage();
  const parsed = riskActionSchema.safeParse(input);
  if (!parsed.success) {
    throw new AuthError(
      AUTH_ERROR_CODES.VALIDATION_FAILED,
      parsed.error.issues[0]?.message ?? '风控操作输入不合法',
    );
  }

  const client = getSupabasePrivilegedClient();
  const d = parsed.data;
  try {
    if (d.type === 'domain') {
      if (d.action === 'delete') {
        const { error } = await client.from('link_domains').delete().eq('domain', d.domain);
        if (error) throw new Error(error.message);
      } else {
        // upsert：存在则更新 kind/note，否则插入
        const exists = await client
          .from('link_domains')
          .select('domain')
          .eq('domain', d.domain)
          .maybeSingle();
        if (exists.error) throw new Error(exists.error.message);
        if (exists.data) {
          const { error } = await client
            .from('link_domains')
            .update({ kind: d.kind, note: d.note ?? '' })
            .eq('domain', d.domain);
          if (error) throw new Error(error.message);
        } else {
          const { error } = await client.from('link_domains').insert({
            domain: d.domain,
            kind: d.kind ?? 'trusted',
            note: d.note ?? '',
          });
          if (error) throw new Error(error.message);
        }
      }
    } else if (d.type === 'url') {
      const id = Number(d.id);
      if (d.action === 'delete') {
        const { error } = await client.from('url_audit').delete().eq('id', id);
        if (error) throw new Error(error.message);
      } else if (d.risk) {
        const { error } = await client.from('url_audit').update({ risk: d.risk }).eq('id', id);
        if (error) throw new Error(error.message);
      }
    } else {
      // upload：approve / reject 写回 upload_audit.status
      const status = d.action === 'approve' ? 'approved' : 'rejected';
      const { error } = await client
        .from('upload_audit')
        .update({ status })
        .eq('id', Number(d.id));
      if (error) throw new Error(error.message);
    }
  } catch (err) {
    console.error('[risk] applyRisk failed:', err instanceof Error ? err.message : err);
    throw new AuthError(AUTH_ERROR_CODES.INTERNAL_ERROR, '风控操作失败，请稍后重试');
  }
}
