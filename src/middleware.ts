import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Need to duplicate SECRET decoding here for Edge runtime
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-me-in-production-please-64chars!!",
);

export async function middleware(request: NextRequest) {
  // Only protect specific routes, for example dashboard and admin
  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");
  const isAdmin = request.nextUrl.pathname.startsWith("/admin");
  const isProtectedApi = request.nextUrl.pathname.startsWith("/api/") && 
    !request.nextUrl.pathname.startsWith("/api/auth/login") &&
    !request.nextUrl.pathname.startsWith("/api/auth/refresh");

  if (!isDashboard && !isAdmin && !isProtectedApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get("access_token")?.value;

  if (!token) {
    if (isProtectedApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);
    
    // For admin routes, we can't reliably check isSuperAdmin here without DB
    // since we removed it from token. Wait, we can pass it in `ver` or something, 
    // but better to handle strictly in API Wrapper or Node API route.
    // However, basic auth is verified.
    
    // Pass user ID down
    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.uid as string);
    response.headers.set("x-session-id", payload.sid as string);
    return response;
  } catch (err) {
    // Token invalid or expired.
    // If it's an API, return 401 to trigger refresh on client
    if (isProtectedApi) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }
    // If it's a page, redirect to login (or let client-side handle refresh, but basic redirect is safer)
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/:path*",
  ],
};
