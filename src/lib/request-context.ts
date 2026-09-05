// 请求级 requestId 上下文：入口统一生成一次，贯穿 policy/command/repo/RPC/日志/响应。
// 基于 AsyncLocalStorage（Node 运行时，Server Actions / Route Handlers 可用），
// 避免在 10+ 文件间透传参数，也避免模块级单例在请求间串号。
import { AsyncLocalStorage } from 'node:async_hooks';
import { generateRequestId } from '@/lib/auth/errors';

const requestStore = new AsyncLocalStorage<string>();

/**
 * 请求入口包裹：为本次请求生成唯一 requestId，并使其在整条调用链
 * （policy → command → repo/RPC → 日志）内可被 getRequestId() 读取。
 * 返回值 requestId 用于放入 HTTP/Server Action 响应体。
 */
export function withRequestId<T>(handler: (requestId: string) => Promise<T>): Promise<T> {
  const requestId = generateRequestId();
  return requestStore.run(requestId, () => handler(requestId));
}

/** 读取当前请求的 requestId；未被 withRequestId 包裹时返回 null。 */
export function getRequestId(): string | null {
  return requestStore.getStore() ?? null;
}
