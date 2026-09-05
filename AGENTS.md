# AGENTS.md

## 项目概览
引力治理体系中心管理后台 - B端平台治理管理系统

## 技术栈
- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **Icons**: lucide-react
- **Data**: Supabase（service-role 服务端直连 + RLS 兜底）

## 架构模式（M1-M3 落地 + 模块化收口，新模块必须遵循）
- **业务装配单元 = `src/modules/<domain>/` 七件套**：`types/schema/policy/mapper/queries/commands + index`（只读模块如 `overview` 可省略 `commands`），index 统一 re-export。
- **读数据 = Server Components 直查模块 query**（RSC 页面服务端查询，零客户端 fetch）
- **写操作 = Server Actions**（zod 校验 + `requirePermission`/policy + `revalidatePath`）
- **数据访问入口 = `src/modules/*` 或受控 `src/lib/repos/*`**（不得在页面/组件内联 SQL 查询，不得绕过 modules 直接 import supabase-client）
- **认证/授权 = `src/lib/auth`**：`policy`(`requirePermission`/`can`) + `permissions`(权限名) + `errors`(错误码) + `context`(请求上下文)，多项式权限判断统一走 policy，避免散落的 `is_admin`
- **客户端 = 三类受控工厂** `src/storage/database/supabase-client.ts`：`getSupabasePublicClient`(匿名) / `getSupabaseRlsClient(token)`(用户态) / `getSupabasePrivilegedClient`(service-role，仅服务端受控处)。禁止 `'use client'` 文件与 `page.tsx` 直接引入
- **schema 唯一来源 = `supabase/migrations/*`**；应用类型仍从 `src/lib/db-types.ts`（手写 Database 接口，supabase-js 全链路类型校验）+ zod schema（`src/lib/validations/*` 或模块内 `*.schema.ts`）
- **筛选/分页 = URL searchParams 驱动**（服务端过滤分页，可分享回退）
- **架构守护 = `pnpm check:architecture`**（校验 client 边界 / 页面直连 / 旧暗取入口 / 散落 is_admin），已串入 `validate` 前置

## 目录结构
```
src/
├── middleware.ts                     # 鉴权：JWT 校验 + token 自动刷新 + 配置缺失 500 + 未登录重定向 /login
├── server.ts                         # 独立服务入口（tsup 打包用）
├── app/
│   ├── layout.tsx                    # 根布局
│   ├── globals.css                   # 全局样式
│   ├── (auth)/login/page.tsx         # 登录页（Server Action 提交）
│   └── (dashboard)/                  # 仪表板路由组（layout 内 requireAdmin 守卫）
│       ├── layout.tsx                # 仪表板布局（侧边栏+头部+鉴权）
│       ├── page.tsx                  # 治理总览（RSC）
│       ├── loading.tsx / error.tsx / not-found.tsx  # 路由级边界
│       ├── content-review/ product-gov/ report/ infringement/  # 内容审核 / 商品治理 / 举报 / 侵权申诉（RSC）
│       ├── risk-control/ activity/ rules/ user-auth/ user-management/  # 风控 / 活动 / 规则 / 认证 / 用户管理（RSC）
│   └── api/
│       └── auth/                     # 仅认证：me / change-password（其余业务 API 已由 RSC+SA 取代）
├── components/
│   ├── features/                     # 按业务域拆分的页面组件（server/client 按需）
│   │   ├── overview/ review/ report/ user-auth/ product-gov/ infringement/
│   │   └── risk-control/ activity/ rules/ users/
│   ├── layout/
│   │   ├── app-sidebar.tsx           # 浅色侧边栏（导航分3组）
│   │   ├── dashboard-header.tsx      # 顶部栏（头像下拉：个人信息/系统设置/修改密码/退出登录）
│   │   ├── profile-drawer.tsx / password-drawer.tsx / settings-drawer.tsx
│   │   └── auth-types.ts             # 认证类型与偏好设置工具
│   ├── charts/svg-charts.tsx         # 手写 SVG 折线/柱状图
│   └── ui/                           # shadcn/ui 组件库
├── modules/                          # 业务模块装配单元（数据访问 + 领域装配主入口）
│   ├── report/ users/ content-review/ activity/ product-gov/ appeal/ risk/ rules/ overview/
│   │   └── <domain>.{types,schema,policy,mapper,queries,commands}.ts + index.ts
│   └── ...（只读模块如 overview 可省略 commands）
├── lib/
│   ├── auth.ts                       # getCurrentUser / getCurrentAdmin / requireAdmin（基于 RLS 客户端）
│   ├── auth-actions.ts               # 登录 / 登出 Server Actions（公开客户端工厂）
│   ├── auth-cookies.ts               # session cookie 常量与选项
│   ├── current-user.ts               # 官网地址配置（登录 id 由 JWT 解析）
│   ├── db-types.ts                   # 手写 Database 接口（17 表 + 6 RPC）
│   ├── dao.ts                        # 轻量共享查询工具（fetchUserNames/groupByStatus/countRows）
│   ├── auth/                         # 集中权限层（新代码统一入口，勿再散落 is_admin）
│   │   ├── policy.ts                 # requirePermission / can（统一授权）
│   │   ├── permissions.ts            # 权限名集中定义（report.read / user.ban ...）
│   │   ├── context.ts                # 当前请求认证上下文（含权限集合）
│   │   ├── errors.ts                 # 认证授权错误码
│   │   └── http.ts                   # HTTP 适配
│   ├── repos/                        # 遗留过渡仓（新逻辑改走 modules；此处保留兼容）
│   │   ├── user-repo.ts content-repo.ts report-repo.ts auth-repo.ts auth-session-repo.ts
│   │   ├── overview-repo.ts product-repo.ts appeal-repo.ts risk-repo.ts
│   │   └── activity-repo.ts rule-repo.ts notification-repo.ts
│   ├── actions/                      # Server Actions（写操作，调用 modules/repos）：
│   │   └── {user,review,report,auth,product,appeal,risk,activity,rule,notification}-actions.ts
│   └── validations/                  # zod schema（输入边界）
├── storage/database/
│   └── supabase-client.ts            # 三类受控客户端唯一工厂：Public / Rls(token) / Privileged（service-role）
└── hooks/                            # 共享 hooks（client）

scripts/
└── check-architecture.mjs            # 架构完整性守护（pnpm check:architecture）

supabase/
└── migrations/                       # schema 唯一来源（001..009：含 006 RBAC / 007 治理事务 RPC / 008/009 union 视图）
```

## 开发命令
- `pnpm dev` - 启动开发服务器
- `pnpm build` - 构建生产版本
- `pnpm start` - 启动生产服务
- `pnpm ts-check` - TypeScript 类型检查
- `pnpm lint` - ESLint 检查
- `pnpm check:architecture` - 架构完整性守护（client 边界 / 页面直连 / 旧暗取入口 / 散落 is_admin）
- `pnpm validate` - 架构守护 + 类型 + lint + stylelint 全量校验（改动后必须全绿；stylelint 目前在 globals.css 有既有债）

## 设计规范
- 侧边栏浅色背景 `#FFFFFF`，激活项 accent `#E8F5F1` + 左侧 3px 品牌绿竖线
- 主工作区背景 `#F7F8FA`，卡片 `#FFFFFF`，主文字 `#1F2329`，次要 `#646A73`
- 品牌绿 `#006855`（primary），语义色：成功 `#00A870` / 信息 `#3370FF` / 警告 `#FF8800` / 危险 `#F54A45` / 严重 `#D92D20`
- 严格纯色，禁止渐变；圆角 8px；无阴影（1px 边框替代）；表格行高 48px
- 顶部栏单个用户头像下拉菜单，侧边栏不放头像
- 详见 `DESIGN.md`

## 用户认证体系
- 登录页 + Supabase Auth 邮箱密码登录，登录态存 httpOnly cookie（`gov-session` / `gov-refresh`），middleware 校验 + 自动刷新；`NEXT_PUBLIC_SUPABASE_URL` 等配置缺失时 middleware 返回 500（不放行）
- 管理员判定：登录用户 `users.is_admin = true`（`requireAdmin` 统一守卫：页面 layout / Server Actions / auth API）
- 细粒度权限走集中 policy 层 `src/lib/auth/policy.ts`（`requirePermission('report.approve')` 等），权限名集中在 `permissions.ts`；不要再在页面/action 里散落 `is_admin` 判断（check:architecture R4 会告警）
- RBAC 数据模型（roles/permissions/user_roles/role_permissions/governance_scopes）与治理字段见迁移 `006_rbac_audit.sql`
- 资料写回 `public.users` 表；邮箱/密码修改走 Supabase Auth（`admin.updateUserById` + password grant 校验）
- 治理操作（封禁/限流/处罚/角色）写 `users` 治理列 + `governance_penalties` 流水（可审计）；批量写入/处罚单侧重状态变更走事务 RPC（迁移 `007_governance_transaction_rpc.sql`）
- 系统偏好设置（通知/语言/主题）`localStorage` 持久化

## 代码规范
- 函数参数必须标注类型；禁止 any（db-types + zod 贯穿）
- 使用 'use client' 处理客户端动态内容；页面默认 Server Component
- 复用 `@/lib/utils` 中的 `cn` 工具函数
- 客户端组件与 page.tsx 不得直接引入 `@/storage/database/supabase-client`
- 新增业务模块遵循「modules 七件套 + RSC 页面 + features 组件」：即 `types/schema/policy/mapper/queries/commands + index`，写入口走 Server Actions，授权走 `requirePermission`
