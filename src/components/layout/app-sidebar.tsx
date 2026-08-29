'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShieldCheck,
  BadgeCheck,
  PackageSearch,
  Flag,
  Scale,
  Radar,
  Megaphone,
  ScrollText,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: '工作台',
    items: [{ label: '治理总览', href: '/', icon: LayoutDashboard }],
  },
  {
    title: '审核与处置',
    items: [
      { label: '内容审核', href: '/content-review', icon: ShieldCheck },
      { label: '用户认证', href: '/user-auth', icon: BadgeCheck },
      { label: '用户管理', href: '/user-management', icon: Users },
      { label: '商品治理', href: '/product-gov', icon: PackageSearch },
      { label: '举报处理', href: '/report', icon: Flag },
      { label: '侵权与申诉', href: '/infringement', icon: Scale },
      { label: '风控中心', href: '/risk-control', icon: Radar },
    ],
  },
  {
    title: '运营与规则',
    items: [
      { label: '活动上架编辑', href: '/activity', icon: Megaphone },
      { label: '规则与处罚', href: '/rules', icon: ScrollText },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[232px] shrink-0 flex-col border-r border-[#E5E6EB] bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#006855]">
          <ShieldCheck className="h-[18px] w-[18px] text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold text-[#1F2329]">引力治理中心</div>
          <div className="text-[10px] tracking-wide text-[#646A73]">GRAVITY GOVERNANCE</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-5">
            <div className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-[#646A73]">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-[10px] text-[13px] transition-colors duration-150 ease-out',
                      active
                        ? 'bg-[#E8F5F1] text-[#006855]'
                        : 'text-[#646A73] hover:bg-[#E8F5F1] hover:text-[#1F2329]'
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-r-full bg-[#006855]" />
                    )}
                    <Icon
                      className={cn(
                        'h-[17px] w-[17px] shrink-0',
                        active ? 'text-[#006855]' : 'text-[#9AA0A6] group-hover:text-[#1F2329]'
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}