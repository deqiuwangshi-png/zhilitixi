import 'server-only';
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

function getSupabasePublicClient(): SupabaseClient<Database> {
  const { url, anonKey } = getSupabaseCredentials();
  return buildClient(url, anonKey, undefined);
}

function getSupabaseRlsClient(token: string): SupabaseClient<Database> {
  const { url, anonKey } = getSupabaseCredentials();
  return buildClient(url, anonKey, { Authorization: `Bearer ${token}` });
}

function getSupabasePrivilegedClient(): SupabaseClient<Database> {
  const { url } = getSupabaseCredentials();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for privileged operations');
  }
  const globalForSupabase = globalThis as unknown as { __govSupabaseServerClient?: SupabaseClient<Database> };
  if (!globalForSupabase.__govSupabaseServerClient) {
    globalForSupabase.__govSupabaseServerClient = buildClient(url, serviceRoleKey, undefined);
  }
  return globalForSupabase.__govSupabaseServerClient;
}

// 兼容现有业务 repo；新认证代码必须明确选择 RLS 或 privileged 客户端。
function getSupabaseClient(): SupabaseClient<Database> {
  const { url, anonKey } = getSupabaseCredentials();
  const globalForSupabase = globalThis as unknown as { __govSupabaseLegacyClient?: SupabaseClient<Database> };
  if (!globalForSupabase.__govSupabaseLegacyClient) {
    const serviceRoleKey = getSupabaseServiceRoleKey();
    globalForSupabase.__govSupabaseLegacyClient = buildClient(url, serviceRoleKey ?? anonKey, undefined);
  }
  return globalForSupabase.__govSupabaseLegacyClient;
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

export {
  loadEnv,
  getSupabaseCredentials,
  getSupabaseServiceRoleKey,
  getSupabasePublicClient,
  getSupabaseRlsClient,
  getSupabasePrivilegedClient,
  getSupabaseClient,
};