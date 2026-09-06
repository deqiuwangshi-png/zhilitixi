import Link from 'next/link';
import { Globe, Pill, Radio } from 'lucide-react';

const tabs = [
  { key: 'url', label: 'URL 风控', icon: Globe },
  { key: 'domain', label: '域名黑白名单', icon: Pill },
  { key: 'upload', label: '上传审核', icon: Radio },
] as const;

export type RiskTab = (typeof tabs)[number]['key'];

/** 风险监控 tab（URL 参数驱动） */
export function RiskTabs({ current }: { current: RiskTab }) {
  return (
    <div className="flex rounded-md bg-[#F7F8FA] p-1">
      {tabs.map((t) => {
        const active = current === t.key;
        const Icon = t.icon;
        return (
          <Link
            key={t.key}
            href={t.key === 'domain' ? '/risk-control' : `/risk-control?tab=${t.key}`}
            className={`flex items-center gap-1 rounded px-3 py-1 text-[13px] transition-colors ${
              active ? 'bg-white text-[#1F2329] shadow-sm' : 'text-[#646A73] hover:text-[#1F2329]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
