import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import { 
  REFRESH_COOKIE_NAME, 
  signAccessToken, 
  accessTokenCookieOptions,
  clearSessionCookie,
  clearRefreshCookie
} from "@/lib/auth";
import { revokeSession, logAuthAction } from "@/lib/auth-service";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: "No refresh token" }, { status: 401 });
    }

    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    const [sessions] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM sessions WHERE refresh_token_hash = ? LIMIT 1",
      [refreshTokenHash]
    );

    const session = sessions[0];

    // Invalid session or already revoked -> Force logout
    if (!session || session.revoked || new Date(session.expires_at) < new Date()) {
      if (session) {
        await revokeSession(session.id);
      }
      
      const response = NextResponse.json({ error: "Session invalid" }, { status: 401 });
      response.cookies.set(clearSessionCookie());
      response.cookies.set(clearRefreshCookie());
      return response;
    }

    // Check RBAC version
    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT auth_version FROM users WHERE id = ? LIMIT 1",
      [session.user_id]
    );

    const user = users[0];
    if (!user) {
      const response = NextResponse.json({ error: "User not found" }, { status: 401 });
      response.cookies.set(clearSessionCookie());
      response.cookies.set(clearRefreshCookie());
      return response;
    }

    // Issue new Access Token
    const authVersion = user.auth_version || 1;
    const token = await signAccessToken({
      sid: session.id,
      uid: session.user_id,
      ver: authVersion,
    });

    await logAuthAction(session.user_id, session.tenant_id, "TOKEN_REFRESH", request);
    
    // Update last activity
    await pool.query("UPDATE sessions SET last_activity = NOW() WHERE id = ?", [session.id]);

    const response = NextResponse.json({ success: true });
    response.cookies.set(accessTokenCookieOptions(token));
    return response;
  } catch (error) {
    console.error("Refresh token error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
