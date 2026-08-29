import Link from 'next/link';

// 404 页（dashboard 路由组共用）
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-32">
      <div className="text-4xl font-bold text-[#1F2329]">404</div>
      <div className="text-sm text-[#646A73]">页面不存在或已被移除</div>
      <Link
        href="/"
        className="rounded-md bg-[#006855] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#005643]"
      >
        返回治理总览
      </Link>
    </div>
  );
}
