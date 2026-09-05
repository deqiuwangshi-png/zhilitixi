import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/policy';
import { Permissions } from '@/lib/auth/permissions';
import { AUTH_ERROR_CODES, createApiError } from '@/lib/auth/errors';
import { toErrorResponse } from '@/lib/auth/http';
import { withRequestId } from '@/lib/request-context';
import { changeAdminPassword } from '@/lib/repos/auth-session-repo';
import { changePasswordSchema } from '@/lib/validations/auth-api.schema';

// POST /api/auth/change-password
// body: { currentPassword, newPassword }
// 校验当前密码（Supabase Auth password grant）后，通过 admin API 更新新密码。
export async function POST(req: NextRequest) {
  return withRequestId(async (requestId) => {
    try {
      const admin = await requirePermission(Permissions.userEdit);
      const body = await req.json().catch(() => ({}));
      const parsed = changePasswordSchema.safeParse(body ?? {});
      if (!parsed.success) {
        return NextResponse.json(
          createApiError(AUTH_ERROR_CODES.VALIDATION_FAILED, requestId, parsed.error.issues[0]?.message),
          { status: 400 },
        );
      }
      await changeAdminPassword({ userId: admin.userId }, parsed.data.currentPassword, parsed.data.newPassword);
      return NextResponse.json({ success: true, requestId });
    } catch (e) {
      return toErrorResponse(e);
    }
  });
}
