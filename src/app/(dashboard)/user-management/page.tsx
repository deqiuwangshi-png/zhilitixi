import { requireAdmin } from '@/lib/auth';
import { listUsers, listPenaltiesGrouped, type UserListItem } from '@/lib/repos/user-repo';
import { UserManagementClient } from '@/components/features/users/user-management-client';

export interface UserPageParams {
  status?: string;
  role?: string;
  anomaly?: string;
  q?: string;
  page?: string;
  size?: string;
}

// 服务端筛选 + 分页（RSC：零客户端 fetch）
export default async function UserManagementPage({
  searchParams,
}: {
  searchParams: Promise<UserPageParams>;
}) {
  const params = await searchParams;
  await requireAdmin();

  const [rows, penalties] = await Promise.all([listUsers(), listPenaltiesGrouped()]);

  let filtered: UserListItem[] = rows;
  if (params.status && params.status !== 'all') filtered = filtered.filter((r) => r.status === params.status);
  if (params.role && params.role !== 'all') filtered = filtered.filter((r) => r.role === params.role);
  if (params.anomaly === 'yes') filtered = filtered.filter((r) => !!r.anomaly);
  if (params.anomaly === 'no') filtered = filtered.filter((r) => !r.anomaly);
  if (params.q?.trim()) {
    const q = params.q.trim().toLowerCase();
    filtered = filtered.filter((r) => r.name.toLowerCase().includes(q));
  }

  const pageSize = params.size ? Number(params.size) : 10;
  const page = Math.max(1, Number(params.page) || 1);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <UserManagementClient
      rows={pageRows}
      histories={penalties}
      total={total}
      page={safePage}
      pageSize={pageSize}
      totalPages={totalPages}
      current={params}
    />
  );
}
