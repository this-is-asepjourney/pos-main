import pool from "@/lib/db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import argon2 from "argon2";
import crypto from "crypto";

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(password: string, hash: string, algo: string): Promise<boolean> {
  if (algo === "bcrypt") {
    const bcrypt = await import("bcryptjs");
    return bcrypt.compare(password, hash);
  }
  return argon2.verify(hash, password);
}

export async function createSession(userId: string, tenantId: string | null, role: string, branchIds: any[], req: Request) {
  const sid = crypto.randomBytes(16).toString("hex");
  const refreshToken = crypto.randomBytes(32).toString("hex");
  const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  await pool.query(
    `INSERT INTO sessions (id, user_id, tenant_id, role, branch_ids, device_info, ip_address, expires_at, refresh_token_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [sid, userId, tenantId, role, JSON.stringify(branchIds), userAgent, ip, expiresAt, refreshTokenHash]
  );
  
  return { sid, refreshToken };
}

export async function revokeSession(sid: string) {
  await pool.query("UPDATE sessions SET revoked = TRUE WHERE id = ?", [sid]);
}

export async function logAuthAction(userId: string | null, tenantId: string | null, action: string, req: Request, metadata: any = {}) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  
  await pool.query(
    `INSERT INTO auth_logs (id, user_id, tenant_id, action, ip_address, device_info, metadata)
     VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
    [userId, tenantId, action, ip, userAgent, JSON.stringify(metadata)]
  );
}

export async function getSessionFromDb(sid: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM sessions WHERE id = ? AND revoked = FALSE AND expires_at > NOW() LIMIT 1",
    [sid]
  );
  return rows[0] || null;
}

export async function getUserAuthVersion(userId: string): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT auth_version FROM users WHERE id = ? LIMIT 1", [userId]);
  return rows[0]?.auth_version || 1;
}
