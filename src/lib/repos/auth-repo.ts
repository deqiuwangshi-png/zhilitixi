// 用户认证仓储层：认证申请列表（联表用户名）+ 审核写操作。
import { getSupabaseClient } from '@/storage/database/supabase-client';

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface VerificationItem {
  id: string;
  userId: string | null;
  vtype: string | null;
  statement: string | null;
  status: VerificationStatus;
  createdAt: string | null;
  userName: string;
}

export interface AuthData {
  verifications: VerificationItem[];
  totalUsers: number;
}

/** 认证申请列表 + 注册用户总数 */
export async function listAuthData(): Promise<AuthData> {
  const client = getSupabaseClient();
  const [{ data: verifications }, { count: totalUsers }] = await Promise.all([
    client.from('verifications').select('*').order('created_at', { ascending: false }).limit(200),
    client.from('users').select('id', { count: 'exact', head: true }),
  ]);
  const rows = verifications ?? [];

  // 联表用户名
  const userIds = new Set<string>();
  for (const v of rows) if (v.user_id) userIds.add(v.user_id);
  const userNames: Record<string, string> = {};
  if (userIds.size) {
    const { data: users } = await client.from('users').select('id,name').in('id', Array.from(userIds));
    for (const u of users ?? []) userNames[u.id] = u.name ?? '';
  }

  const items: VerificationItem[] = rows.map((v) => ({
    id: v.id,
    userId: v.user_id,
    vtype: v.vtype,
    statement: v.statement,
    status: (v.status as VerificationStatus) || 'pending',
    createdAt: v.created_at,
    userName: userNames[v.user_id ?? ''] || '用户',
  }));

  return { verifications: items, totalUsers: totalUsers ?? 0 };
}

/** 审核认证申请：写回 verifications.status（approve→approved / reject→rejected） */
export async function applyVerification(id: string, action: 'approve' | 'reject'): Promise<void> {
  const status = action === 'approve' ? 'approved' : 'rejected';
  const { error } = await getSupabaseClient().from('verifications').update({ status }).eq('id', id);
  if (error) throw new Error(`applyVerification failed: ${error.message}`);
}
