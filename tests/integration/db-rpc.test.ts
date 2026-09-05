// 真实库集成断言（SQL/RPC 层面，与 scripts/db.mjs 同款 pg 直连）。
// 守卫：无 DATABASE_URL 或 pg 驱动不可解析时整组 skip（对齐 scripts/db.mjs 的 --allow-offline 哲学），
// 单测与 stub 集成不受影响。真实库用例会写入测试用户并产生审计流水（audit_logs 追加式设计，无法删除），
// 使用 vitest- 前缀的 request_id 便于甄别。
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { config as loadDotenv } from 'dotenv';
import type { Client as PgClient } from 'pg';

loadDotenv({ quiet: true });
loadDotenv({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

const DATABASE_URL = process.env.DATABASE_URL;

// ---------- 连接探测（模块顶层，供 describe.skipIf 使用） ----------
let dbReady = false;
let dbSkipReason = '';
let client: PgClient | null = null;
let anonMember = false;
let authenticatedMember = false;

async function checkRoleMember(c: PgClient, role: string): Promise<boolean> {
  const r = await c.query(`SELECT pg_has_role(current_user, $1, 'MEMBER') AS ok`, [role]);
  return (r.rows[0] as { ok: boolean }).ok === true;
}

try {
  if (!DATABASE_URL) {
    dbSkipReason = '缺少 DATABASE_URL';
  } else {
    const { Client } = await import('pg');
    const c = new Client({ connectionString: DATABASE_URL });
    await c.connect();
    client = c;
    dbReady = true;
    anonMember = await checkRoleMember(c, 'anon');
    authenticatedMember = await checkRoleMember(c, 'authenticated');
  }
} catch (e) {
  dbSkipReason = e instanceof Error ? e.message : String(e);
  try {
    await client?.end();
  } catch {
    // 连接可能未建立，忽略
  }
  client = null;
}

if (!dbReady) {
  console.log(`[集成] 跳过真实库断言（${dbSkipReason}）；stub 集成与单测不受影响。`);
}
if (dbReady && !anonMember) {
  console.log('[集成] 当前连接角色无法 SET ROLE anon，anon RLS 用例跳过。');
}
if (dbReady && !authenticatedMember) {
  console.log('[集成] 当前连接角色无法 SET ROLE authenticated，authenticated RLS 用例跳过。');
}

const dbDescribe = describe.skipIf(!dbReady);

dbDescribe('真实库集成（DATABASE_URL）', () => {
  const createdIds: string[] = [];
  const operatorId = randomUUID();

  function makeUser(isAdmin = false): string {
    const id = randomUUID();
    createdIds.push(id);
    return id;
  }

  async function insertUser(id: string, name: string, isAdmin: boolean): Promise<void> {
    await client!.query(
      `INSERT INTO public.users
         (id, name, points, created_at, gov_status, gov_role, anomaly, penalty_count, is_admin)
       VALUES ($1, $2, 0, now(), 'normal', 'user', '', 0, $3)`,
      [id, name, isAdmin],
    );
  }

  async function getUserRow(id: string): Promise<{
    gov_status: string;
    gov_role: string;
    penalty_count: number;
    name: string | null;
    points: number | null;
    badge: string | null;
  }> {
    const r = await client!.query(
      `SELECT gov_status, gov_role, penalty_count, name, points, badge FROM public.users WHERE id = $1`,
      [id],
    );
    return r.rows[0] as {
      gov_status: string;
      gov_role: string;
      penalty_count: number;
      name: string | null;
      points: number | null;
      badge: string | null;
    };
  }

  async function countAuditByRequestId(requestId: string): Promise<number> {
    const r = await client!.query(
      `SELECT count(*)::int AS n FROM public.audit_logs WHERE request_id = $1`,
      [requestId],
    );
    return (r.rows[0] as { n: number }).n;
  }

  async function countPenalties(userId: string, action: string): Promise<number> {
    const r = await client!.query(
      `SELECT count(*)::int AS n FROM public.governance_penalties WHERE user_id = $1 AND action = $2`,
      [userId, action],
    );
    return (r.rows[0] as { n: number }).n;
  }

  function newRequestId(): string {
    return `vitest-${Date.now()}-${randomUUID()}`;
  }

  async function callGovernanceAction(userId: string, action: string, requestId: string): Promise<void> {
    await client!.query(
      `SELECT public.apply_governance_action($1::uuid, $2::text, '集成测试', $3::uuid, $4::text)`,
      [userId, action, operatorId, requestId],
    );
  }

  async function callEditProfile(
    userId: string,
    args: { role?: string | null; name?: string | null; points?: number | null; badge?: string | null },
    requestId: string,
  ): Promise<void> {
    await client!.query(
      `SELECT public.edit_user_profile_and_role($1::uuid, $2::text, $3::text, $4::int, $5::text, $6::uuid, $7::text)`,
      [userId, args.role ?? null, args.name ?? null, args.points ?? null, args.badge ?? null, operatorId, requestId],
    );
  }

  beforeAll(async () => {
    await insertUser(operatorId, 'vitest-operator', true);
  });

  afterAll(async () => {
    // 级联删除处罚流水/user_roles；audit_logs 为追加式（resource_id 无外键），保留但可甄别
    if (createdIds.length > 0) {
      await client!.query('DELETE FROM public.users WHERE id = ANY($1)', [createdIds]);
    }
    await client!.query('DELETE FROM public.users WHERE id = $1', [operatorId]);
    await client!.end();
  });

  describe('apply_governance_action：幂等（同 request_id 只生效一次）', () => {
    it('重复调用同一 request_id → 仅一条审计 + 一条处罚流水 + 状态只更新一次', async () => {
      const uid = makeUser();
      await insertUser(uid, 'vitest-idem', false);
      const requestId = newRequestId();

      await callGovernanceAction(uid, 'ban', requestId);
      await callGovernanceAction(uid, 'ban', requestId);

      expect(await countAuditByRequestId(requestId)).toBe(1);
      expect(await countPenalties(uid, 'ban')).toBe(1);
      await expect(getUserRow(uid)).resolves.toMatchObject({ gov_status: 'banned', penalty_count: 1 });
    });

    it('不同 action 复用同一 request_id → 视为已处理，返回首次结果不重复写', async () => {
      const uid = makeUser();
      await insertUser(uid, 'vitest-idem-2', false);
      const requestId = newRequestId();

      await callGovernanceAction(uid, 'ban', requestId);
      await callGovernanceAction(uid, 'unban', requestId); // 应被幂等拦下

      expect(await countAuditByRequestId(requestId)).toBe(1);
      await expect(getUserRow(uid)).resolves.toMatchObject({ gov_status: 'banned' }); // 未被解除
    });
  });

  describe('edit_user_profile_and_role：资料 + 角色原子', () => {
    it('单次调用同时写资料列 + 角色，产生 edit 与 role_change 两条流水 + 一条审计', async () => {
      const uid = makeUser();
      await insertUser(uid, 'vitest-atomic', false);
      const requestId = newRequestId();

      await callEditProfile(uid, { role: 'moderator', name: '新昵称', points: 120, badge: 'vip' }, requestId);

      await expect(getUserRow(uid)).resolves.toMatchObject({
        name: '新昵称',
        points: 120,
        badge: 'vip',
        gov_role: 'moderator',
      });
      expect(await countPenalties(uid, 'edit')).toBe(1);
      expect(await countPenalties(uid, 'role_change')).toBe(1);
      expect(await countAuditByRequestId(requestId)).toBe(1);
    });

    it('非法角色值 → 整体失败（先校验后写，不产生部分写）', async () => {
      const uid = makeUser();
      await insertUser(uid, 'vitest-invalid', false);
      const before = await getUserRow(uid);

      await expect(
        client!.query(
          `SELECT public.edit_user_profile_and_role($1::uuid, $2::text, $3::text, NULL::int, NULL::text, $4::uuid, NULL::text)`,
          [uid, 'superuser', '改名', operatorId],
        ),
      ).rejects.toThrow(/invalid_role/);

      await expect(getUserRow(uid)).resolves.toEqual(before); // name/gov_role 均未变
    });
  });

  describe('RLS 读取边界', () => {
    it.runIf(anonMember)('anon 读取治理表 → permission denied（不静默泄露）', async () => {
      await client!.query('SET ROLE anon');
      try {
        await expect(client!.query('SELECT * FROM public.users LIMIT 1')).rejects.toThrow(/permission denied/i);
        await expect(client!.query('SELECT * FROM public.permissions LIMIT 1')).rejects.toThrow(
          /permission denied/i,
        );
      } finally {
        await client!.query('RESET ROLE');
      }
    });

    it.runIf(authenticatedMember)('authenticated（无管理员 JWT claims）→ RLS 行级拒绝，返回空而非泄露', async () => {
      await client!.query('SET ROLE authenticated');
      try {
        const users = await client!.query('SELECT count(*)::int AS n FROM public.users');
        expect((users.rows[0] as { n: number }).n).toBe(0);
        const penalties = await client!.query('SELECT count(*)::int AS n FROM public.governance_penalties');
        expect((penalties.rows[0] as { n: number }).n).toBe(0);
        const audit = await client!.query('SELECT count(*)::int AS n FROM public.audit_logs');
        expect((audit.rows[0] as { n: number }).n).toBe(0);
      } finally {
        await client!.query('RESET ROLE');
      }
    });
  });

  describe('事务 RPC 授权面', () => {
    it('apply_governance_action / edit_user_profile_and_role 未授予 anon 与 public EXECUTE', async () => {
      const r = await client!.query(
        `SELECT
           has_function_privilege('anon', 'public.apply_governance_action(uuid,text,text,uuid,text,timestamptz)', 'EXECUTE') AS anon_gov,
           has_function_privilege('public', 'public.apply_governance_action(uuid,text,text,uuid,text,timestamptz)', 'EXECUTE') AS public_gov,
           has_function_privilege('anon', 'public.edit_user_profile_and_role(uuid,text,text,int,text,uuid,text)', 'EXECUTE') AS anon_edit,
           has_function_privilege('public', 'public.edit_user_profile_and_role(uuid,text,text,int,text,uuid,text)', 'EXECUTE') AS public_edit`,
      );
      expect(r.rows[0]).toEqual({
        anon_gov: false,
        public_gov: false,
        anon_edit: false,
        public_edit: false,
      });
    });
  });
});
