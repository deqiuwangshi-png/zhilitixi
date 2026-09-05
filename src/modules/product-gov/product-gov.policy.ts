// 商品治理模块：资源授权策略。
// 复用 @/lib/auth/policy 统一 requirePermission，按动作映射细分权限。
import { requirePermission } from '@/lib/auth/policy';
import { Permissions } from '@/lib/auth/permissions';

/** 读取商品列表 / 统计：要求 product.read */
export function requireProductRead() {
  return requirePermission(Permissions.productRead);
}

/** 商品写操作（编辑 / 下架 / 删除）：要求 product.manage */
export function requireProductManage() {
  return requirePermission(Permissions.productManage);
}