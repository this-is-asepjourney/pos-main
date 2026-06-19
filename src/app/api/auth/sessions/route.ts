import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import { revokeSession, logAuthAction } from "@/lib/auth-service";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, device_info, ip_address, created_at, last_activity, expires_at FROM sessions WHERE user_id = ? AND revoked = FALSE AND expires_at > NOW() ORDER BY last_activity DESC",
      [session.uid]
    );

    const sessions = rows.map((r) => ({
      ...r,
      is_current: r.id === session.sid
    }));

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Fetch sessions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const action = url.searchParams.get("action"); // 'logout-device' or 'logout-all'

    if (action === "logout-device") {
      const { sessionId } = await request.json();
      if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

      // Verify the session belongs to the user
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM sessions WHERE id = ? AND user_id = ? LIMIT 1",
        [sessionId, session.uid]
      );

      if (rows.length > 0) {
        await revokeSession(sessionId);
        await logAuthAction(session.uid, session.tenantId, "SESSION_REVOKED", request, { revokedSid: sessionId });
      }

      return NextResponse.json({ success: true });
    } 
    
    if (action === "logout-all") {
      // Revoke all other sessions
      await pool.query(
        "UPDATE sessions SET revoked = TRUE WHERE user_id = ? AND id != ?",
        [session.uid, session.sid]
      );

      // Increment auth_version to invalidate all old tokens (even if they weren't in the DB properly)
      await pool.query(
        "UPDATE users SET auth_version = auth_version + 1 WHERE id = ?",
        [session.uid]
      );

      await logAuthAction(session.uid, session.tenantId, "SESSION_REVOKED_ALL", request);
      
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Manage sessions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
