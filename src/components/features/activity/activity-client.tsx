'use client';

import { useState } from 'react';
import type { ActivityItem } from '@/lib/repos/activity-repo';
import type { ActivityPageParams } from '@/app/(dashboard)/activity/page';
import { ActivityFilters } from './activity-filters';
import { ActivityTable } from './activity-table';
import { ActivityDrawer } from './activity-drawer';

interface Props {
  rows: ActivityItem[];
  total: number;
  page: number;
  totalPages: number;
  current: ActivityPageParams;
}

/** 活动页客户端容器：持有新增/编辑抽屉状态，数据全部来自 RSC props */
export function ActivityClient({ rows, total, page, totalPages, current }: Props) {
  const [drawer, setDrawer] = useState<null | { mode: 'add' | 'edit'; item?: ActivityItem }>(null);

  return (
    <div className="rounded-lg border border-[#E5E6EB] bg-white">
      <ActivityFilters current={current} onAdd={() => setDrawer({ mode: 'add' })} />
      <ActivityTable rows={rows} total={total} page={page} totalPages={totalPages} onEdit={(a) => setDrawer({ mode: 'edit', item: a })} />
      {drawer && (
        <ActivityDrawer
          mode={drawer.mode}
          item={drawer.item}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}
