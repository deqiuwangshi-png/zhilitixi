'use client';

import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Search, Bell, ChevronDown, User, Settings, LogOut, Key } from 'lucide-react';
import { ProfileDrawer } from '@/components/layout/profile-drawer';
import { PasswordDrawer } from '@/components/layout/password-drawer';
import { SettingsDrawer } from '@/components/layout/settings-drawer';
import { loadPreferences, applyTheme, type CurrentUser, type PanelKey } from '@/components/layout/auth-types';
import { logoutAction } from '@/lib/auth-actions';
import type { NotificationItem } from '@/lib/repos/notification-repo';
import { NotificationPanel } from '@/components/features/notifications/notification-panel';

const SITE_HOME_URL = process.env.NEXT_PUBLIC_SITE_HOME_URL || 'https://www.gravity-governance.cn';

const pageTitles: Record<string, { title: string; desc: string }> = {
  '/': { title: '治理总览', desc: '平台治理数据概览与核心指标监控' },
  '/content-review': { title: '内容审核', desc: '管理平台内容安全审核与合规检查' },
  '/user-auth': { title: '用户认证', desc: '用户身份认证与资质审核管理' },
  '/product-gov': { title: '商品治理', desc: '商品信息合规检查与违规处置' },
  '/report': { title: '举报处理', desc: '用户举报受理与处理结果跟踪' },
  '/infringement': { title: '侵权与申诉', desc: '知识产权侵权处理与用户申诉管理' },
  '/risk-control': { title: '风控中心', desc: '平台风险识别、预警与防控策略' },
  '/activity': { title: '活动上架编辑', desc: '平台活动配置、上架审核与内容编辑' },
  '/rules': { title: '规则与处罚', desc: '治理规则配置与违规处罚执行' },
  '/user-management': { title: '用户管理', desc: '平台用户状态、角色与处罚管理' },
};

export function DashboardHeader({ notifications }: { notifications: NotificationItem[] }) {
  const pathname = usePathname();
  const pageInfo = pageTitles[pathname] || { title: '治理总览', desc: '' };
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [panel, setPanel] = useState<PanelKey | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.user) setUser(data.user);
    } catch {
      // 忽略
    }
  }, []);

  useEffect(() => {
    loadMe();
    applyTheme(loadPreferences().theme);
  }, [loadMe]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleLogout = async () => {
    if (signingOut) return;
    const confirmed = window.confirm('确定退出登录吗？');
    if (!confirmed) return;
    setSigningOut(true);
    try {
      await logoutAction();
    } catch {
      // 忽略异常，仍继续跳转
    } finally {
      setSigningOut(false);
      window.location.href = SITE_HOME_URL;
    }
  };

  const openPanel = (key: PanelKey) => {
    setDropdownOpen(false);
    setPanel(key);
  };

  const displayName = user?.name || '管理员';
  const email = user?.email || 'admin@governance.cn';
  const avatar = user?.avatarUrl?.startsWith('http') ? user.avatarUrl : '';

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-[#E5E6EB] bg-white px-6">
      <div>
        <h1 className="text-[15px] font-semibold leading-tight text-[#1F2329]">{pageInfo.title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 rounded-md border border-[#E5E6EB] bg-[#F7F8FA] px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-[#646A73]" />
          <input
            type="text"
            placeholder="搜索..."
            className="w-36 border-none bg-transparent text-sm text-[#1F2329] outline-none placeholder:text-[#646A73]"
          />
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-[#646A73] transition-colors hover:bg-[#F7F8FA] hover:text-[#1F2329]"
            aria-label="消息通知"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#F54A45] text-[8px] font-bold leading-none text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <NotificationPanel notifications={notifications} onClose={() => setNotifOpen(false)} />
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-[#E5E6EB]" />

        {/* User Avatar Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-[#F7F8FA]"
          >
            <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[#006855] text-xs font-semibold text-white">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                (displayName || '管')[0]
              )}
            </div>
            <span className="text-sm font-medium text-[#1F2329]">{displayName}</span>
            <ChevronDown className={cn('h-3.5 w-3.5 text-[#646A73] transition-transform duration-150', dropdownOpen && 'rotate-180')} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-[#E5E6EB] bg-white py-1" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
              <div className="border-b border-[#F7F8FA] px-3 py-2.5">
                <p className="truncate text-sm font-medium text-[#1F2329]">{displayName}</p>
                <p className="truncate text-xs text-[#646A73]">{email}</p>
              </div>
              <div className="py-1">
                <button onClick={() => openPanel('profile')} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[#1F2329] transition-colors hover:bg-[#F7F8FA]">
                  <User className="h-3.5 w-3.5 text-[#646A73]" />
                  个人信息
                </button>
                <button onClick={() => openPanel('settings')} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[#1F2329] transition-colors hover:bg-[#F7F8FA]">
                  <Settings className="h-3.5 w-3.5 text-[#646A73]" />
                  系统设置
                </button>
                <button onClick={() => openPanel('password')} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[#1F2329] transition-colors hover:bg-[#F7F8FA]">
                  <Key className="h-3.5 w-3.5 text-[#646A73]" />
                  修改密码
                </button>
              </div>
              <div className="border-t border-[#F7F8FA] py-1">
                <button onClick={handleLogout} disabled={signingOut} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[#F54A45] transition-colors hover:bg-[#FEF2F2] disabled:opacity-60">
                  <LogOut className="h-3.5 w-3.5" />
                  {signingOut ? '退出中...' : '退出登录'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {panel === 'profile' && user && (
        <ProfileDrawer user={user} onClose={() => setPanel(null)} onSaved={() => { loadMe(); }} />
      )}
      {panel === 'password' && <PasswordDrawer onClose={() => setPanel(null)} />}
      {panel === 'settings' && <SettingsDrawer onClose={() => setPanel(null)} />}
    </header>
  );
}