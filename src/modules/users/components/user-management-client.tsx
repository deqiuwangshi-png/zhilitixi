'use client';

import { useState } from 'react';
import type { UserItem as UserListItem, PenaltyRecord } from '../users.types';
import type { UserPageParams } from '../users.types';
import { UserFilters } from './user-filters';
import { UserTable } from './user-table';
import { UserDetailDrawer } from './user-drawer';
import { UserEditDrawer } from './user-edit-drawer';

interface Props {
  rows: UserListItem[];
  histories: Record<string, PenaltyRecord[]>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  current: UserPageParams;
}

/** 用户管理页客户端容器：持有抽屉状态，数据全部来自 RSC props（零 fetch） */
export function UserManagementClient({ rows, histories, total, page, pageSize, totalPages, current }: Props) {
  const [selected, setSelected] = useState<UserListItem | null>(null);
  const [editing, setEditing] = useState<UserListItem | null>(null);

  return (
    <div className="space-y-4">
      <UserFilters current={current} />
      <UserTable rows={rows} total={total} page={page} pageSize={pageSize} totalPages={totalPages} onView={setSelected} onEdit={setEditing} />

      {selected && (
        <UserDetailDrawer
          user={selected}
          history={histories[selected.id] ?? []}
          onClose={() => setSelected(null)}
        />
      )}

      {editing && (
        <UserEditDrawer
          user={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
