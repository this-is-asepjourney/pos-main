import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const COOKIE_NAME = "access_token";
export const REFRESH_COOKIE_NAME = "refresh_token";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-me-in-production-please-64chars!!",
);

export type MinimalPayload = JWTPayload & {
  sid: string;
  uid: string;
  ver: number;
};

// Backward compatible for existing routes
export type SessionPayload = MinimalPayload & {
  email: string;
  name: string;
  tenantId: string | null;
  role: string;
  branchIds: string[];
  isSuperAdmin: boolean;
};

export async function signAccessToken(payload: Omit<MinimalPayload, keyof JWTPayload>): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m") // 15 menit
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<MinimalPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as MinimalPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  
  const decoded = await verifyToken(token);
  if (!decoded) return null;

  // Retrieve full session details from DB to keep backward compatibility
  const [sessions] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM sessions WHERE id = ? AND revoked = FALSE AND expires_at > NOW() LIMIT 1",
    [decoded.sid]
  );
  const session = sessions[0];
  if (!session) return null;

  const [users] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM users WHERE id = ? AND auth_version = ? LIMIT 1",
    [decoded.uid, decoded.ver]
  );
  const user = users[0];
  if (!user) return null;

  // Update last activity
  await pool.query("UPDATE sessions SET last_activity = NOW() WHERE id = ?", [session.id]);

  return {
    ...decoded,
    email: user.email,
    name: user.name,
    tenantId: session.tenant_id,
    role: session.role,
    branchIds: typeof session.branch_ids === 'string' ? JSON.parse(session.branch_ids) : session.branch_ids,
    isSuperAdmin: Boolean(user.is_superadmin)
  };
}

export async function getSuperAdminSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session?.isSuperAdmin) return null;
  return session;
}

export function accessTokenCookieOptions(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.SECURE_COOKIE === "true",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 15 * 60, // 15 menit
  };
}

export function refreshTokenCookieOptions(token: string) {
  return {
    name: REFRESH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.SECURE_COOKIE === "true",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  };
}

export function clearSessionCookie() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.SECURE_COOKIE === "true",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

export function clearRefreshCookie() {
  return {
    name: REFRESH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.SECURE_COOKIE === "true",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 0,
  };
}

// Keep this export for backward compatibility with older auth code while migrating
export const signToken = signAccessToken;
export const sessionCookieOptions = accessTokenCookieOptions;
