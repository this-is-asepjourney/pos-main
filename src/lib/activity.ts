import pool from "./db";

export async function logActivity({
  tenantId,
  userId,
  userName,
  action,
  description,
  metadata = null,
}: {
  tenantId: string;
  userId?: string | null;
  userName?: string | null;
  action: string;
  description: string;
  metadata?: any;
}) {
  try {
    await pool.query(
      `INSERT INTO activity_logs (id, tenant_id, user_id, user_name, action, description, metadata, created_at)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, NOW())`,
      [
        tenantId,
        userId || null,
        userName || null,
        action,
        description,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Kita tidak throw error agar tidak mengganggu proses utama
  }
}
