export interface CurrentUser {
  id: string;
  name: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  points: number;
  badge: string;
  createdAt: string | null;
  email: string;
  phone: string;
  provider: string;
  emailConfirmed: boolean;
}

export interface SessionItem {
  id: string;
  userAgent: string;
  createdAt: string;
  updatedAt: string;
}

export type PanelKey = 'profile' | 'password' | 'settings';

/** 系统偏好设置（localStorage 持久化） */
export interface Preferences {
  notify: boolean;
  lang: 'zh' | 'en';
  theme: 'light' | 'dark' | 'system';
}

export const DEFAULT_PREFERENCES: Preferences = {
  notify: true,
  lang: 'zh',
  theme: 'light',
};

export function loadPreferences(): Preferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem('gov-preferences');
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: Preferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem('gov-preferences', JSON.stringify(prefs));
  } catch {
    // 忽略
  }
}

/** 依据偏好设置主题并应用到 <html> */
export function applyTheme(theme: Preferences['theme']): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  let dark = false;
  if (theme === 'dark') {
    dark = true;
  } else if (theme === 'system') {
    dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }
  root.classList.toggle('dark', dark);
}