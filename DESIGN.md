# DESIGN.md

## 项目与用户画像
- 引力治理体系中心管理后台
- 面向平台运营/治理人员的 B 端管理系统
- 气质：权威、克制、高效、秩序感
- 色彩配比：60% 中性灰白 · 30% 边框与次级文字 · 10% 品牌绿 + 语义色

## 气质与意象
- 深夜指挥中心的沉静感——深墨蓝侧边栏如同暗色控制台，右侧工作区如明亮屏幕
- 现代政务信息系统的克制：冷灰石材地面、磨砂金属门牌、柔和的间接照明

## Design Tokens

### 主色调（CSS 变量）
- `--background: hsl(216,18%,97%)` `#F7F8FA` 主工作区底色
- `--card: hsl(0,0%,100%)` `#FFFFFF` 卡片/容器背景
- `--foreground: hsl(220,13%,13%)` `#1F2329` 主文字
- `--muted-foreground: hsl(220,7%,46%)` `#646A73` 次要文字
- `--primary: hsl(168,100%,20%)` `#006855` 品牌绿
- `--primary-foreground: hsl(0,0%,100%)` `#FFFFFF`
- `--accent: hsl(168,45%,94%)` `#E8F5F1` 选中/hover 背景
- `--accent-foreground: hsl(168,100%,20%)` `#006855`
- `--border: hsl(228,14%,91%)` `#E5E6EB` 边框

### 语义色
- 成功 `#00A870` / 信息 `#3370FF` / 警告 `#FF8800` / 危险 `#F54A45` / 严重 `#D92D20`

### 导航（侧边栏）
- 宽度 232px，浅色调：#FFFFFF 底色，文字 #646A73，激活文字品牌绿 #006855
- 激活项背景 #E8F5F1 + 左侧 3px 品牌绿竖线 #006855
- 组件图标激活态为品牌绿

### 字体
- 标题/正文：Noto Sans SC, PingFang SC, system-ui
- 等宽：JetBrains Mono, SF Mono（域名/ID/URL）
- 标题 18-20px/600，正文 14px/400，辅助 12px/400，指标数值 28px bold

## 布局与响应式
- 双栏固定布局：左侧 232px 侧边栏 + 右侧弹性内容区
- 主内容区 `max-w-[1208px]` 居中，内边距 px-6 py-6
- 顶部栏高度 64px，含单个用户头像下拉菜单（侧边栏不放头像）
- 卡片内边距 p-6(24px)，卡片间距 gap-4(16px)，圆角 rounded-lg(8px)
- 阴影 shadow-none（用 1px 边框 #E5E6EB 替代）
- 表格行高 48px，最小宽度 1024px（B 端不考虑移动端）

## 交互与状态
- hover/focus 过渡 150ms ease-out
- 抽屉滑入 250ms；呼吸动画 2s infinite（用于警示）
- 表格行 hover：#F8FAFC
- 导航项 hover：#E8F5F1 背景，文字变 #1F2329

## 数据对接
- 全部模块对接 Supabase 主库（表：users / verifications / discoveries / square_posts / comments / reports / link_domains / url_audit / upload_audit / announcements / notifications）
- 治理总览统计从上述表聚合计算

## 设计禁忌
- 禁止使用任何渐变（gradient）
- 禁止圆角过大（>12px）
- 禁止荧光色、霓虹色
- 禁止动画/过渡超过 300ms（警示呼吸动画除外）
- 禁止将头像放入侧边栏（仅顶部栏）