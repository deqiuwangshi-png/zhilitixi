import { NextRequest, NextResponse } from 'next/server';
import { AUTH_ERROR_CODES, createApiError } from '@/lib/auth/errors';
import { toErrorResponse } from '@/lib/auth/http';
import { withRequestId } from '@/lib/request-context';
import {
  getAdminProfileAndSessions,
  updateAdminProfile,
  updateProfileSchema,
  requireAuthAccess,
} from '@/modules/auth';

// GET /api/auth/me - 当前管理员聚合资料 + 会话列表（需登录管理员本人）
export async function GET() {
  return withRequestId(async (requestId) => {
    try {
      const admin = await requireAuthAccess();
      const { user, sessions } = await getAdminProfileAndSessions({ userId: admin.userId });
      return NextResponse.json({ user, sessions, requestId });
    } catch (e) {
      return toErrorResponse(e);
    }
  });
}

// PUT /api/auth/me - 编辑当前管理员资料（写回主库 users 表 + 同步 auth user_metadata）
export async function PUT(req: NextRequest) {
  return withRequestId(async (requestId) => {
    try {
      const admin = await requireAuthAccess();
      const body = await req.json().catch(() => ({}));
      const parsed = updateProfileSchema.safeParse(body ?? {});
      if (!parsed.success) {
        return NextResponse.json(
          createApiError(AUTH_ERROR_CODES.VALIDATION_FAILED, requestId, parsed.error.issues[0]?.message),
          { status: 400 },
        );
      }
      await updateAdminProfile({ userId: admin.userId }, parsed.data);
      return NextResponse.json({ success: true, requestId });
    } catch (e) {
      return toErrorResponse(e);
    }
  });
}
