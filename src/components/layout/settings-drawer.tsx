'use client';

import { useEffect, useState } from 'react';
import { X, Bell, Languages, Palette, Save } from 'lucide-react';
import { loadPreferences, savePreferences, applyTheme, type Preferences } from './auth-types';

export function SettingsDrawer({ onClose }: { onClose: () => void }) {
  const [prefs, setPrefs] = useState<Preferences>(() => loadPreferences());
  const [saved, setSaved] = useState(false);

  const persist = (next: Preferences) => {
    setPrefs(next);
    savePreferences(next);
    applyTheme(next.theme);
    setSaved(false);
  };

  useEffect(() => {
    applyTheme(prefs.theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = () => {
    savePreferences(prefs);
    applyTheme(prefs.theme);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" style={{ animation: 'fade-in 200ms ease-out' }} onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col bg-white ring-1 ring-[#E5E6EB]" style={{ animation: 'drawer-in 250ms ease-out' }}>
        <div className="border-b border-[#E5E6EB] px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#1F2329]">系统设置</h2>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-[#646A73] transition-colors hover:bg-[#F8FAFC]">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {saved && (
            <div className="mb-4 rounded-md bg-[#E8F5F1] px-3 py-2 text-xs text-[#006855]">设置已保存</div>
          )}

          {/* 通知 */}
          <SettingRow icon={<Bell className="h-4 w-4 text-[#006855]" />} title="消息通知" desc="接收系统消息与待办提醒">
            <button
              type="button"
              role="switch"
              aria-checked={prefs.notify}
              onClick={() => persist({ ...prefs, notify: !prefs.notify })}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${prefs.notify ? 'bg-[#006855]' : 'bg-[#E5E6EB]'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${prefs.notify ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </SettingRow>

          {/* 语言 */}
          <SettingRow icon={<Languages className="h-4 w-4 text-[#006855]" />} title="界面语言" desc="切换后台显示语言">
            <select
              value={prefs.lang}
              onChange={(e) => persist({ ...prefs, lang: e.target.value as Preferences['lang'] })}
              className="rounded-md border border-[#E5E6EB] bg-white px-3 py-1.5 text-sm text-[#1F2329] outline-none transition-colors focus:border-[#006855]"
            >
              <option value="zh">简体中文</option>
              <option value="en">English</option>
            </select>
          </SettingRow>

          {/* 主题 */}
          <SettingRow icon={<Palette className="h-4 w-4 text-[#006855]" />} title="外观主题" desc="选择后台配色方案">
            <select
              value={prefs.theme}
              onChange={(e) => persist({ ...prefs, theme: e.target.value as Preferences['theme'] })}
              className="rounded-md border border-[#E5E6EB] bg-white px-3 py-1.5 text-sm text-[#1F2329] outline-none transition-colors focus:border-[#006855]"
            >
              <option value="light">浅色</option>
              <option value="dark">深色</option>
              <option value="system">跟随系统</option>
            </select>
          </SettingRow>
        </div>

        <div className="flex items-center gap-3 border-t border-[#E5E6EB] px-6 py-4">
          <button
            onClick={save}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#006855] py-2 text-sm font-medium text-white transition-colors hover:bg-[#005A4B]"
          >
            <Save className="h-4 w-4" />
            保存设置
          </button>
        </div>
      </div>
    </>
  );
}

function SettingRow({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[#E5E6EB] p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-[#1F2329]">{title}</div>
          <div className="mt-0.5 text-xs text-[#646A73]">{desc}</div>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}