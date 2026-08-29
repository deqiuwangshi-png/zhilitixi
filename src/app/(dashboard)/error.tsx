'use client';

// 路由级错误边界（dashboard 路由组共用）
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-32">
      <div className="rounded-lg bg-[#FDEBEA] px-4 py-2 text-sm text-[#F54A45]">
        页面渲染出错：{error.message || '未知错误'}
      </div>
      <button
        onClick={reset}
        className="rounded-md bg-[#006855] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#005643]"
      >
        重试
      </button>
    </div>
  );
}
