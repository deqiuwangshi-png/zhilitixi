'use client';

import { useState } from 'react';
import type { ProductItem } from '../product-gov.types';
import type { ProductPageParams } from '../product-gov.types';
import { ProductFilters } from './product-filters';
import { ProductTable } from './product-table';
import { ProductDetailDrawer } from './product-detail-drawer';
import { ProductEditDrawer } from './product-edit-drawer';

interface Props {
  rows: ProductItem[];
  total: number;
  page: number;
  totalPages: number;
  current: ProductPageParams;
}

/** 商品治理页客户端容器：持有详情/编辑抽屉状态，数据全部来自 RSC props */
export function ProductClient({ rows, total, page, totalPages, current }: Props) {
  const [detail, setDetail] = useState<ProductItem | null>(null);
  const [editing, setEditing] = useState<ProductItem | null>(null);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[15px] font-semibold text-[#1F2329]">商品治理</div>
        <ProductFilters current={current} />
      </div>

      <ProductTable rows={rows} total={total} page={page} totalPages={totalPages} onView={setDetail} onEdit={setEditing} />

      {detail && <ProductDetailDrawer item={detail} onClose={() => setDetail(null)} />}
      {editing && <ProductEditDrawer item={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
