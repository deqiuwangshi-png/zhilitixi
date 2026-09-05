#!/usr/bin/env node
// 架构完整性校验：守护治理后台的架构边界，防止新代码回退破坏规约。
// 运行：pnpm check:architecture （也可直接 node scripts/check-architecture.mjs）
// 规则(命中任一违规即 exit 1 → FAIL)：
//  R1  Client Component('use client') 不得导入/使用 Supabase 客户端
//  R2  页面 src/app/**/page.tsx（Server Component）不得直接 import supabase-client 绕过 modules/repo
//  R3  全项目禁止出现旧暗取入口 getSupabaseClient
// 规则(仅告警，不阻断 → WARN)：
//  R4  页面 / Server Action 中散落的 is_admin 直接判断（应经 requirePermission），列出便于人工核对
//
// 保守性：client 判定用 'use client' 指令精确匹配（仅脚本首部）；仅扫描代码扩展名；
// 不含 supabase-client 的三类受控工厂（Public/Rls/Privileged）虽被引用，仍属服务端受控入口，不告警。

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SELF = normalize(path.join(ROOT, 'scripts', 'check-architecture.mjs'));

// 扫描范围：除构建/缓存目录外的全部代码文件。
const IGNORED_DIRS = new Set(['node_modules', '.next', 'dist', 'out', 'build', '.git', '.workbuddy', '.coze']);
const CODE_EXT_RE = /\.(ts|tsx|mjs|cjs|js)$/;

// 从 @/storage/database/supabase-client 导入
const SUPABASE_IMPORT_RE = /from\s*['"]@\/storage\/database\/supabase-client['"]/;
// 直接调用 Supabase 客户端工厂
const SUPABASE_CALL_RE = /\bgetSupabase(?:Public|Rls|Privileged)Client\b|\bgetSupabaseCredentials\b|\bgetSupabaseServiceRoleKey\b/;
// 旧暗取入口（2026-09 已删除，作为守护残留）
const LEGACY_RE = /\bgetSupabaseClient\b/;
// 散落 is_admin 判断
const IS_ADMIN_RE = /\bis_admin\b/;

// R4 仅对“页面 + Server Action”告警，auth 兼容层（lib/auth、repos、modules 内）不报警，避免误报。
const R4_FILE_RE = /^src\/app\/.*\/page\.tsx$|^src\/lib\/actions\//;

// 页面 Server Component（R2）
const PAGE_RE = /^src\/app\/.*\/page\.tsx$/;

// 'use client' 指令必须在文件最前面；只检查前 2 行。
function isUseClient(lines) {
  for (let i = 0; i < Math.min(2, lines.length); i++) {
    if (/^\s*['"]use client['"]\s*/.test(lines[i])) return true;
  }
  return false;
}

function normalize(p) {
  return p.split(path.sep).join('/');
}

function walk(dir) {
  let out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (IGNORED_DIRS.has(e.name)) continue;
      out = out.concat(walk(path.join(dir, e.name)));
    } else if (CODE_EXT_RE.test(e.name)) {
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

/** 单行命中收集 */
function collect(lines, re) {
  const hits = [];
  lines.forEach((line, i) => {
    if (re.test(line)) hits.push(i + 1);
  });
  return hits;
}

// 统一输出：每个文件归为一组，非零违规逐行列出。
const findings = { fail: [], warn: [] };
let scanned = 0;

for (const abs of walk(ROOT)) {
  if (normalize(abs) === SELF) continue;
  const rel = normalize(path.relative(ROOT, abs));
  const src = fs.readFileSync(abs, 'utf8');
  const lines = src.split('\n');
  scanned++;

  const fileFails = [];
  const fileWarns = [];

  // R3 全项目禁旧暗取入口（最高优先级）
  if (/^src|^scripts|^middleware\.ts$|^server\.ts$/.test(rel)) {
    for (const n of collect(lines, LEGACY_RE)) fileFails.push(`  R3 遗留暗取入口 getSupabaseClient  @${n}`);
  }

  const useClient = isUseClient(lines);

  // R1 Client Component 不得使用 Supabase 客户端
  if (useClient) {
    for (const n of collect(lines, SUPABASE_IMPORT_RE)) fileFails.push(`  R1 Client Component 导入 supabase-client  @${n}`);
    for (const n of collect(lines, SUPABASE_CALL_RE)) fileFails.push(`  R1 Client Component 调用 getSupabase*Client  @${n}`);
  }

  // R2 页面不得直接 import supabase-client
  if (PAGE_RE.test(rel) && !useClient) {
    for (const n of collect(lines, SUPABASE_IMPORT_RE)) fileFails.push(`  R2 页面直接 import supabase-client（应走 @/modules 或 lib/repos）  @${n}`);
    for (const n of collect(lines, SUPABASE_CALL_RE)) fileFails.push(`  R2 页面直接调用 getSupabase*Client（应走 @/modules 或 lib/repos）  @${n}`);
  }

  // R4 散落 is_admin（仅告警）
  if (R4_FILE_RE.test(rel)) {
    for (const n of collect(lines, IS_ADMIN_RE)) fileWarns.push(`  R4 散落 is_admin 判断（考虑改走 requirePermission）  @${n}`);
  }

  if (fileFails.length) findings.fail.push(`== ${rel}\n${fileFails.join('\n')}`);
  if (fileWarns.length) findings.warn.push(`== ${rel}\n${fileWarns.join('\n')}`);
}

// 输出
const out = [];
if (findings.fail.length) {
  out.push('\n[check:architecture] 违规（阻断）：');
  out.push(findings.fail.join('\n'));
}
if (findings.warn.length) {
  out.push('\n[check:architecture] 告警（不阻断，请人工核对）：');
  out.push(findings.warn.join('\n'));
}

const failCount = findings.fail.length;
if (failCount === 0) {
  out.push('\n[check:architecture] 通过：未发现架构违规。');
} else {
  out.push(`\n[check:architecture] 失败：发现 ${failCount} 个违规文件，需修复后再提交。`);
  out.push('（R4 为告警不计失败；R1/R2/R3 任意命中即失败）');
}

console.log(out.join('\n'));
process.exit(failCount === 0 ? 0 : 1);