import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getReportBuffer, createWrappedFetch } from 'coze-coding-dev-sdk';
import dotenv from 'dotenv';
import type { Database } from '@/lib/db-types';

let envLoaded = false;

interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

function loadEnv(): void {
  if (envLoaded || (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
    return;
  }
  try {
    dotenv.config();
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      envLoaded = true;
    }
  } catch {
    // dotenv not available
  }
}

function getSupabaseCredentials(): SupabaseCredentials {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }
  if (!anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set');
  }

  return { url, anonKey };
}

function getSupabaseServiceRoleKey(): string | undefined {
  loadEnv();
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;
}

function getSupabaseClient(token?: string): SupabaseClient<Database> {
  const { url, anonKey } = getSupabaseCredentials();

  // 带用户 token 的客户端：请求级新建（登录/中间件校验用），不做缓存
  if (token) {
    return buildClient(url, anonKey, { Authorization: `Bearer ${token}` });
  }

  // 服务端 service-role 客户端：进程级单例（消除每请求 createClient 的开销）
  const globalForSupabase = globalThis as unknown as { __govSupabaseServerClient?: SupabaseClient<Database> };
  if (!globalForSupabase.__govSupabaseServerClient) {
    const serviceRoleKey = getSupabaseServiceRoleKey();
    globalForSupabase.__govSupabaseServerClient = buildClient(url, serviceRoleKey ?? anonKey, undefined);
  }
  return globalForSupabase.__govSupabaseServerClient;
}

function buildClient(url: string, key: string, authHeaders: Record<string, string> | undefined): SupabaseClient<Database> {
  const globalOptions: { headers?: Record<string, string>; fetch?: typeof fetch } = {};
  if (authHeaders) {
    globalOptions.headers = authHeaders;
  }
  try {
    const buffer = getReportBuffer();
    if (buffer) {
      globalOptions.fetch = createWrappedFetch(buffer, 'supabase');
    }
  } catch {
    // Silent — reporting setup failure should not block client creation
  }

  return createClient<Database>(url, key, {
    global: globalOptions,
    db: {
      timeout: 60000,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export { loadEnv, getSupabaseCredentials, getSupabaseServiceRoleKey, getSupabaseClient };