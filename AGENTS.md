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

## 架构模式（M1-M3 落地，新模块必须遵循）
- **读数据 = Server Components 直查 repo**（RSC 页面服务端查询，零客户端 fetch）
- **写操作 = Server Actions**（`'use server'` + zod 校验 + `requireAdmin` + `revalidatePath`）
- **数据访问唯一入口 = `src/lib/repos/*`**（不得在页面/组件内联 SQL 查询）
- **类型贯穿 = `src/lib/db-types.ts`**（手写 Database 接口，supabase-js 全链路类型校验）+ zod schema（`src/lib/validations/*`）
- **筛选/分页 = URL searchParams 驱动**（服务端过滤分页，可分享回退）

## 目录结构
```
src/
├── middleware.ts                     # 鉴权：JWT 校验 + token 自动刷新 + 未登录重定向 /login
├── app/
│   ├── layout.tsx                    # 根布局
│   ├── globals.css                   # 全局样式
│   ├── (auth)/login/page.tsx         # 登录页（Server Action 提交）
│   └── (dashboard)/                  # 仪表板路由组（layout 内 requireAdmin 守卫）
│       ├── layout.tsx                # 仪表板布局（侧边栏+头部+鉴权）
│       ├── page.tsx                  # 治理总览（RSC）
│       ├── loading.tsx / error.tsx / not-found.tsx  # 路由级边界
│       ├── content-review/page.tsx   # 内容审核（RSC）
│       ├── user-auth/page.tsx        # 用户认证（RSC）
│       ├── product-gov/page.tsx      # 商品治理（RSC）
│       ├── report/page.tsx           # 举报处理（RSC）
│       ├── infringement/page.tsx     # 侵权与申诉（RSC）
│       ├── risk-control/page.tsx     # 风控中心（RSC）
│       ├── activity/page.tsx         # 活动上架编辑（RSC）
│       ├── rules/page.tsx            # 规则与处罚（RSC）
│       └── user-management/page.tsx  # 用户管理（RSC）
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
└── lib/
    ├── auth.ts                       # getCurrentUser / getCurrentAdmin / requireAdmin
    ├── auth-actions.ts               # 登录 / 登出 Server Actions
    ├── auth-cookies.ts               # session cookie 常量与选项
    ├── current-user.ts               # 官网地址配置（登录 id 由 JWT 解析）
    ├── db-types.ts                   # 手写 Database 接口（17 表 + 6 RPC）
    ├── dao.ts                        # 轻量共享查询工具（fetchUserNames/groupByStatus/countRows）
    ├── repos/                        # 仓储层（唯一数据访问入口）
    │   ├── user-repo.ts content-repo.ts report-repo.ts auth-repo.ts
    │   ├── overview-repo.ts product-repo.ts appeal-repo.ts risk-repo.ts
    │   └── activity-repo.ts rule-repo.ts
    ├── actions/                      # Server Actions（写操作）
    │   ├── user-actions.ts review-actions.ts report-actions.ts auth-actions.ts
    │   ├── product-actions.ts appeal-actions.ts risk-actions.ts
    │   └── activity-actions.ts rule-actions.ts
    └── validations/                  # zod schema（输入边界）
        ├── user.schema.ts review.schema.ts report.schema.ts verification.schema.ts
        ├── product.schema.ts appeal.schema.ts risk.schema.ts
        └── activity.schema.ts rule.schema.ts
```

## 开发命令
- `pnpm dev` - 启动开发服务器
- `pnpm build` - 构建生产版本
- `pnpm start` - 启动生产服务
- `pnpm ts-check` - TypeScript 类型检查
- `pnpm lint` - ESLint 检查
- `pnpm validate` - 类型 + lint + stylelint 全量校验（改动后必须全绿）

## 设计规范
- 侧边栏浅色背景 `#FFFFFF`，激活项 accent `#E8F5F1` + 左侧 3px 品牌绿竖线
- 主工作区背景 `#F7F8FA`，卡片 `#FFFFFF`，主文字 `#1F2329`，次要 `#646A73`
- 品牌绿 `#006855`（primary），语义色：成功 `#00A870` / 信息 `#3370FF` / 警告 `#FF8800` / 危险 `#F54A45` / 严重 `#D92D20`
- 严格纯色，禁止渐变；圆角 8px；无阴影（1px 边框替代）；表格行高 48px
- 顶部栏单个用户头像下拉菜单，侧边栏不放头像
- 详见 `DESIGN.md`

## 用户认证体系
- 登录页 + Supabase Auth 邮箱密码登录，登录态存 httpOnly cookie（`gov-session` / `gov-refresh`），middleware 校验 + 自动刷新
- 管理员判定：登录用户 `users.is_admin = true`（`requireAdmin` 统一守卫：页面 layout / Server Actions / auth API）
- 资料写回 `public.users` 表；邮箱/密码修改走 Supabase Auth（`admin.updateUserById` + password grant 校验）
- 治理操作（封禁/限流/处罚/角色）写 `users` 治理列 + `governance_penalties` 流水（可审计）
- 系统偏好设置（通知/语言/主题）`localStorage` 持久化

## 代码规范
- 函数参数必须标注类型；禁止 any（db-types + zod 贯穿）
- 使用 'use client' 处理客户端动态内容；页面默认 Server Component
- 复用 `@/lib/utils` 中的 `cn` 工具函数
- 新增业务模块遵循「repo + zod + SA + RSC 页面 + features 组件」五件套
