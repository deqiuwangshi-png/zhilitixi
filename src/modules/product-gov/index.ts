// 商品治理模块：公共入口（显式导出白名单，供页面 / 组件 / Server Actions 使用）。
export type {
  ProductItem,
  ProductSource,
  ProductStatus,
  ProductStats,
  ProductListQuery,
  ProductPageResult,
  ProductPageParams,
} from './product-gov.types';

export type { ProductEditInput, ProductDeleteInput } from './product-gov.schema';

export { requireProductRead, requireProductManage } from './product-gov.policy';
export { listProducts, getProductStats } from './product-gov.queries';
export { productListQuerySchema, toProductListQuery } from './product-gov.schema';
