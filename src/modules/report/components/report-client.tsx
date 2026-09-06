'use client';

import { useState } from 'react';
import type { ReportItem } from '@/modules/report';
import type { ReportPageParams } from '@/modules/report';
import { ReportFilters } from './report-filters';
import { ReportTable } from './report-table';
import { ReportDrawer } from './report-drawer';

interface Props {
  rows: ReportItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  current: ReportPageParams;
}

/** 举报处理页客户端容器：持有详情抽屉状态，数据全部来自 RSC props（零 fetch） */
export function ReportClient({ rows, total, page, pageSize, totalPages, current }: Props) {
  const [detail, setDetail] = useState<ReportItem | null>(null);

  return (
    <div className="space-y-4">
      <ReportFilters current={current} />
      <ReportTable
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        onView={setDetail}
      />
      {detail && <ReportDrawer report={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
