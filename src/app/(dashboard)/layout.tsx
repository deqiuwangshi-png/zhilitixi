import type { Metadata } from 'next';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { requireAdmin } from '@/lib/auth';
import { listNotifications } from '@/modules/notification';

export const metadata: Metadata = {
  title: '引力治理体系中心',
  description: '引力治理体系中心管理后台',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 服务端鉴权：未登录 / 非管理员 → 重定向 /login
  const admin = await requireAdmin();

  // 顶栏通知（服务端查询，header 组件零 fetch）
  let notifications: Awaited<ReturnType<typeof listNotifications>> = [];
  try {
    notifications = await listNotifications(admin.userId);
  } catch {
    // 通知表异常不阻断布局
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(216,18%,97%)]">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader notifications={notifications} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1208px] px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
