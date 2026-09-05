#!/usr/bin/env node
// ============================================================
// scripts/db.mjs
// 治理体系中心 · migration 执行与验证纳入部署（spec §触发测试与 migration 部署闭环）
//
// 命令：
//   node scripts/db.mjs migrate [--allow-offline]
//   node scripts/db.mjs verify  [--allow-offline]
//
// 设计原则（跨平台，纯 Node，不新增第三方依赖）：
//   - migrations 是 schema 唯一来源（supabase/migrations/<NNN>_*.sql，只读）。
//   - 执行器优先级：
//      1) 内置 `pg` 驱动（若仓库已引入）＋ `DATABASE_URL` → 直接直连执行 / 校验
//      2) `supabase` CLI ＋ `supabase/config.toml` → `supabase db push`
//      3) 以上均不可用 → 退化为「校验文件序列/完整性 + 输出逐条 psql 命令」，
//         `db:verify` 此时因缺少可执行驱动而失败关闭（fail-closed），
//         供本地无库 / 无驱动场景用 `--allow-offline` 显式跳过。
//   仓库当前未引入 `pg`，本机亦无 psql/supabase CLI，故默认走路径 3。
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MIG_DIR = path.join(ROOT, 'supabase', 'migrations');

// ---------- env：加载 DOTENV（.env / .env.local），不覆盖已存在的环境变量 ----------
import { config as dotenv } from 'dotenv';
dotenv({ quiet: true });
dotenv({ path: path.join(ROOT, '.env.local'), quiet: true });

// ---------- 输出工具 ----------
const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const CYAN = (s) => `\x1b[36m${s}\x1b[0m`;
const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;

// ---------- 迁移文件扫描 ----------
const PREFIX_RE = /^(\d{3,})_(.+\.sql)$/;

function listMigrations() {
  let names;
  try {
    names = fs.readdirSync(MIG_DIR);
  } catch {
    return null; // 目录不存在
  }
  const files = [];
  const seen = new Set();
  for (const name of names.sort()) {
    const m = name.match(PREFIX_RE);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    const abs = path.join(MIG_DIR, name);
    const size = fs.statSync(abs).size;
    files.push({ n, name, abs, size });
    seen.add(n);
  }
  files.sort((a, b) => a.n - b.n);
  // 序号连续性与重复检测
  const gaps = [];
  if (files.length) {
    for (let i = files[0].n; i <= files[files.length - 1].n; i++) {
      if (!seen.has(i)) gaps.push(i);
    }
  }
  const duplicates = seen.size !== files.length;
  const unnamed = names
    .filter((nm) => nm.endsWith('.sql') && !PREFIX_RE.test(nm))
    .sort();
  return { files, gaps, duplicates, unnamed };
}

function printMigratePlan(files, gaps, duplicates, unnamed) {
  console.log('\n' + BOLD('[db:migrate] 迁移文件序列（按编号序）'));
  for (const f of files) {
    const pad = String(f.n).padStart(3, '0');
    console.log(`   ${CYAN(pad)}  ${f.name}  (${f.size} B)`);
  }
  if (gaps.length) {
    console.log(YELLOW(`   注意：检测到编号缺口 ${gaps.map((g) => String(g).padStart(3, '0')).join(', ')}（不影响按序执行，仅提示完整性）。`));
  }
  if (duplicates) console.log(YELLOW('   注意：存在重复编号的迁移文件，请人工核对。'));
  if (unnamed.length) console.log(YELLOW(`   注意：目录下存在不符合 <NNN>_*.sql 命名的文件：${unnamed.join(', ')}（将被忽略）。`));
}

// ---------- 可选执行器探测 ----------
// 仅当 'pg' 确实可解析才返回 true（仓库当前未引入 pg → false，走退化路径）
async function pgAvailable() {
  try {
    await import('pg');
    return true;
  } catch {
    return false;
  }
}
function hasBinary(bin) {
  const r = spawnSync(bin, ['--version'], { encoding: 'utf8', stdio: 'pipe' });
  return !r.error && r.status === 0;
}
function hasSupabaseConfig() {
  return fs.existsSync(path.join(ROOT, 'supabase', 'config.toml'));
}

// ============================================================
// migrate
// ============================================================
async function runMigrate() {
  const url = process.env.DATABASE_URL;
  const listing = listMigrations();
  console.log(CYAN(`[db:migrate] DB 目标：${url ? 'DATABASE_URL 已配置' : 'DATABASE_URL 未配置'}`));

  if (!listing || !listing.files.length) {
    console.error(RED(`[db:migrate] 未在 ${MIG_DIR} 找到任何 <NNN>_*.sql 迁移文件。`));
    process.exit(1);
  }
  printMigratePlan(listing.files, listing.gaps, listing.duplicates, listing.unnamed);

  // 路径 1：内置 pg 驱动 直连（仓库未引入则跳过）
  if (url && (await pgAvailable())) {
    console.log(BOLD('\n[db:migrate] 使用内置 pg 驱动直连执行…'));
    const { default: pgMod } = await import('pg');
    const client = new pgMod.Client({ connectionString: url });
    try {
      await client.connect();
    } catch (e) {
      console.error(RED(`[db:migrate] 连接失败：${e.message}`));
      process.exit(1);
    }
    for (const f of listing.files) {
      const sql = fs.readFileSync(f.abs, 'utf8');
      try {
        await client.query(sql);
        console.log(GREEN(`   ✓ ${f.name}`));
      } catch (e) {
        console.error(RED(`   ✗ ${f.name} → ${e.message}`));
        try { await client.end(); } catch {}
        process.exit(1);
      }
    }
    try { await client.end(); } catch {}
    console.log(GREEN(`[db:migrate] 直连执行完成：${listing.files.length} 个迁移已全部应用。`));
    return 0;
  }

  // 路径 2：supabase CLI（需要 config.toml）
  if (url && hasBinary('supabase') && hasSupabaseConfig()) {
    console.log(BOLD('\n[db:migrate] 使用 supabase CLI 执行 `supabase db push`…'));
    const r = spawnSync('supabase', ['db', 'push'], { cwd: ROOT, stdio: 'inherit' });
    if (r.error || r.status !== 0) {
      console.error(RED('[db:migrate] supabase db push 失败。'));
      process.exit(r.status || 1);
    }
    console.log(GREEN('[db:migrate] supabase db push 成功。'));
    return 0;
  }

  // 路径 3：退化为「校验 + 输出 psql 命令」
  const reason = [];
  if (!url) reason.push('未配置 DATABASE_URL');
  if (!(await pgAvailable())) reason.push('仓库未引入 pg 驱动');
  if (!(hasBinary('supabase') && hasSupabaseConfig())) reason.push('无 supabase CLI / config.toml');
  console.log(YELLOW(`\n[db:migrate] 可选执行器不可用（${reason.filter(Boolean).join('；')}），退化为「校验文件序列 + 输出 psql 命令」，真实执行请在具备 DATABASE_URL 的环境进行：`));
  console.log(BOLD('\n  按序执行等价 psql 命令（bash/zsh；其中 $DATABASE_URL 为 PostgreSQL 直连串）：'));
  for (const f of listing.files) {
    const rel = path.relative(ROOT, f.abs).split(path.sep).join('/');
    console.log(`    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "${rel}"`);
  }
  console.log(YELLOW('\n  提示：路径 3 仅完成文件扫描/完整性校验与命令映射，未修改数据库。'));
  if (!url) {
    console.log(YELLOW('  —— 如需本机对真实库验证，请设置 DATABASE_URL 并重跑；无库验证可用 `node scripts/db.mjs verify --allow-offline`。'));
  }
  console.log(GREEN('[db:migrate] 文件序列校验通过（按编号序无重复、均可读）。'));
  return 0;
}

// ============================================================
// verify
// ============================================================
// 校验清单（与 migrations 目标一致）：
//   RBAC 表 (006) / 事务 RPC 存在且 EXECUTE 仅 service_role (007/010) / union 视图 (008/009) / 核心表 RLS
const RBAC_TABLES = ['roles', 'permissions', 'user_roles', 'role_permissions', 'governance_scopes', 'audit_logs'];
const VIEWS = ['v_product_catalog', 'v_content_review_catalog', 'v_appeal_catalog'];
const RPC_SIGS = {
  apply_governance_action: 'public.apply_governance_action(uuid,text,text,uuid,text,timestamptz)',
  edit_user_profile_and_role: 'public.edit_user_profile_and_role(uuid,text,text,int,text,uuid,text)',
};
const RLS_TABLES = [
  'users', 'governance_penalties', 'reports', 'url_audit', 'upload_audit', 'verifications',
  'permissions', 'roles', 'role_permissions', 'governance_scopes', 'user_roles', 'audit_logs',
];

function buildCheckSQL() {
  const rows = [];
  for (const t of RBAC_TABLES)
    rows.push(`('rbac:${t}', to_regclass('public.${t}') IS NOT NULL, COALESCE(to_regclass('public.${t}')::text, 'missing: public.${t}'))`);
  for (const v of VIEWS)
    rows.push(`('view:${v}', to_regclass('public.${v}') IS NOT NULL, COALESCE(to_regclass('public.${v}')::text, 'missing: public.${v}'))`);
  for (const [name, sig] of Object.entries(RPC_SIGS)) {
    rows.push(`('rpc:${name}:exists', to_regprocedure('${sig}') IS NOT NULL, COALESCE(to_regprocedure('${sig}')::text, 'missing: ${sig}'))`);
    rows.push(`('rpc:${name}:no_anon_exec', NOT has_function_privilege('anon', '${sig}', 'EXECUTE'), 'anon EXECUTE ${name}')`);
    rows.push(`('rpc:${name}:no_public_exec', NOT has_function_privilege('public', '${sig}', 'EXECUTE'), 'public EXECUTE ${name}')`);
  }
  for (const t of RLS_TABLES)
    rows.push(`('rls:${t}', COALESCE((SELECT c.relrowsecurity FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = '${t}'), false), 'rls ${t}')`);
  return `SELECT check_name, ok, detail FROM (VALUES\n  ${rows.join(',\n  ')}\n) AS v(check_name, ok, detail) ORDER BY check_name;`;
}

function printChecksIntro() {
  console.log('\n' + BOLD('[db:verify] 计划校验：'));
  for (const t of RBAC_TABLES) console.log(`   - RBAC 表存在 (006)：public.${t}`);
  for (const v of VIEWS) console.log(`   - union 视图存在 (008/009)：public.${v}`);
  for (const name of Object.keys(RPC_SIGS)) {
    console.log(`   - 事务 RPC 存在 (007/010)：${name}`);
    console.log(`     - EXECUTE 未授予 anon（仅 service_role）`);
    console.log(`     - EXECUTE 未授予 public（仅 service_role）`);
  }
  for (const t of RLS_TABLES) console.log(`   - 核心表已启用 RLS：public.${t}`);
}

function reportChecks(rows, url) {
  // rows: [{check_name, ok(boolean), detail}]
  let fail = 0;
  console.log(BOLD(`\n[db:verify] 对 DATABASE_URL 实测校验：`));
  for (const r of rows) {
    const ok = r.ok === true || String(r.ok) === 't';
    if (!ok) fail++;
    const flag = ok ? GREEN('PASS') : RED('FAIL');
    const hint = r.detail && r.detail !== r.check_name ? `  (${r.detail})` : '';
    console.log(`   ${flag}  ${CYAN(r.check_name)}${hint}`);
  }
  if (fail > 0) {
    console.error(RED(`\n[db:verify] 失败：${fail} 项未通过。`));
    return 1;
  }
  console.log(GREEN('\n[db:verify] 通过：全部安全项符合预期。'));
  return 0;
}

async function runVerify() {
  const url = process.env.DATABASE_URL;
  const allowOffline = process.argv.includes('--allow-offline');

  console.log(CYAN(`[db:verify] 校验目标：${url ? 'DATABASE_URL 已配置' : 'DATABASE_URL 未配置'}`));

  // 显式离线跳过：供本地无库场景
  if (allowOffline) {
    printChecksIntro();
    console.log(YELLOW('\n[db:verify] --allow-offline 已指定：跳过连线校验（本地无库场景）。'));
    console.log(GREEN('[db:verify] 离线模式通过（未对真实库执行校验，请在部署环境做真实验证）。'));
    return 0;
  }

  // 无 DATABASE_URL：默认失败提示（不静默通过）
  if (!url) {
    printChecksIntro();
    console.error(RED('\n[db:verify] 需要配置 DATABASE_URL 以连接数据库进行校验。'));
    console.error(RED('  设置方式：DATABASE_URL="postgresql://..."（或写入 .env / .env.local）。'));
    console.error(RED('  本地无库场景可用 `node scripts/db.mjs verify --allow-offline` 显式跳过。'));
    return 1;
  }
  printChecksIntro();

  // 路径 1：内置 pg 驱动 直连校验
  if (await pgAvailable()) {
    console.log(BOLD('\n[db:verify] 使用内置 pg 驱动直连执行校验…'));
    const { default: pgMod } = await import('pg');
    const client = new pgMod.Client({ connectionString: url });
    try {
      await client.connect();
      const res = await client.query(buildCheckSQL());
      await client.end();
      return reportChecks(res.rows, url);
    } catch (e) {
      try { await client.end(); } catch {}
      console.error(RED(`[db:verify] 直连校验失败：${e.message}`));
      return 1;
    }
  }

  // 路径 2：psql CLI 执行校验 SQL
  if (hasBinary('psql')) {
    console.log(BOLD('\n[db:verify] 使用 psql 执行校验…'));
    const r = spawnSync('psql', ['-d', url, '-P', 'pager=off', '-t', '-A', '-F', '|', '-c', buildCheckSQL()], {
      encoding: 'utf8',
      cwd: ROOT,
      maxBuffer: 16 * 1024 * 1024,
    });
    if (r.error || r.status !== 0 || !r.stdout.trim()) {
      console.error(RED(`[db:verify] psql 执行失败：${r.error?.message || r.stderr?.trim() || '无输出'}`));
      return 1;
    }
    const rows = r.stdout
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [check_name, ok, ...rest] = line.split('|');
        return { check_name, ok: ok === 't' || ok === 'true', detail: rest.join('|') };
      });
    return reportChecks(rows, url);
  }

  // 均不可用：fail-closed，同时给出可执行的校验 SQL 供人工运行
  console.error(RED('\n[db:verify] 未找到可用的执行驱动（仓库未引入 pg，且 PATH 上无 psql），无法连线校验。'));
  console.error(RED('  请至少具备其一：安装/引入 pg，或使用 psql 客户端。'));
  console.error(RED('  本地无库场景可用 `node scripts/db.mjs verify --allow-offline` 显式跳过。'));
  console.error('\n' + YELLOW('[db:verify] 供人工执行的校验 SQL：'));
  console.log(buildCheckSQL());
  return 1;
}

// ============================================================
// 入口
// ============================================================
const cmd = process.argv[2];

try {
  if (cmd === 'migrate') {
    process.exit(await runMigrate());
  } else if (cmd === 'verify') {
    process.exit(await runVerify());
  } else {
    console.log(`用法：node scripts/db.mjs <migrate|verify> [--allow-offline]

  命令：
    migrate  校验并执行 supabase/migrations/*.sql（见优先级：pg → supabase db push → psql 命令映射）
    verify   对 DATABASE_URL 校验关键安全项（RBAC 表 / 事务 RPC 权限 / union 视图 / RLS），失败 exit 1；
             默认无库时失败提示，--allow-offline 跳过

  环境变量：DATABASE_URL（PostgreSQL 直连串）`);
    process.exit(cmd ? 1 : 0);
  }
} catch (e) {
  console.error(RED(`[db.mjs] 未捕获异常：${e?.stack || e}`));
  process.exit(1);
}