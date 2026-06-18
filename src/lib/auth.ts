import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "pos_session";
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-me-in-production-please-64chars!!",
);

export type SessionPayload = JWTPayload & {
  uid: string;
  email: string;
  name: string;
  tenantId: string | null;
  role: string;
  branchIds: string[];
  isSuperAdmin: boolean;
};

export async function signToken(payload: Omit<SessionPayload, keyof JWTPayload>): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Returns session only if user is a superadmin.
 * Use in all /api/admin/* routes.
 */
export async function getSuperAdminSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session?.isSuperAdmin) return null;
  return session;
}

export function sessionCookieOptions(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    // By default false so it works out of the box on HTTP PaaS (Dokploy/Coolify)
    secure: process.env.NODE_ENV === "production" && process.env.SECURE_COOKIE === "true",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
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
