import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, clearSessionCookie, clearRefreshCookie, verifyToken } from "@/lib/auth";
import { revokeSession, logAuthAction } from "@/lib/auth-service";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (token) {
      const decoded = await verifyToken(token);
      if (decoded && decoded.sid) {
        await revokeSession(decoded.sid);
        await logAuthAction(decoded.uid, null, "LOGOUT", request);
      }
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(clearSessionCookie());
    response.cookies.set(clearRefreshCookie());
    
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat logout." },
      { status: 500 },
    );
  }
}
