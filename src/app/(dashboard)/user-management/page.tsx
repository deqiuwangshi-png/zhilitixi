import {
  requireUserRead,
  listUsers,
  listPenaltiesGrouped,
  userListQuerySchema,
  toUserListQuery,
  type UserItem,
} from '@/modules/users';
import { UserManagementClient } from '@/components/features/users/user-management-client';

export interface UserPageParams {
  status?: string;
  role?: string;
  anomaly?: string;
  q?: string;
  page?: string;
  size?: string;
}

export const dynamic = 'force-dynamic';

// 用户治理（RSC：数据库分页筛选，零客户端 fetch；写操作走 Server Actions）
// UserManagementClient 的 current 保持原始 searchParams 形状（字段兼容，不改动）。
const EMPTY_RESULT = { rows: [] as UserItem[], total: 0, page: 1, pageSize: 10, totalPages: 1 };

export default async function UserManagementPage({
  searchParams,
}: {
  searchParams: Promise<UserPageParams>;
}) {
  const params = await searchParams;
  await requireUserRead();

  const parsed = userListQuerySchema.safeParse(params);
  if (!parsed.success) {
    return (
      <UserManagementClient
        rows={EMPTY_RESULT.rows}
        histories={{}}
        total={EMPTY_RESULT.total}
        page={EMPTY_RESULT.page}
        pageSize={EMPTY_RESULT.pageSize}
        totalPages={EMPTY_RESULT.totalPages}
        current={params}
      />
    );
  }

  const [userResult, histories] = await Promise.all([
    listUsers(toUserListQuery(parsed.data)),
    listPenaltiesGrouped(),
  ]);

  return (
    <UserManagementClient
      rows={userResult.rows}
      histories={histories}
      total={userResult.total}
      page={userResult.page}
      pageSize={userResult.pageSize}
      totalPages={userResult.totalPages}
      current={params}
    />
  );
}