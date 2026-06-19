import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import type { DiscountRule, DiscountVoucher } from "@/types/pricing";

// Simple in-memory cache to prevent DB spam on calculateOrder
// In real distributed systems, use Redis.
const cache = new Map<string, { rules: DiscountRule[]; expires: number }>();
const CACHE_TTL = 30000; // 30 seconds

export const discountService = {
  async getActiveRules(tenantId: string): Promise<DiscountRule[]> {
    const cacheKey = `rules:${tenantId}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.rules;
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM discount_rules 
       WHERE tenant_id = ? AND active = TRUE 
       AND (start_at IS NULL OR start_at <= NOW())
       AND (end_at IS NULL OR end_at >= NOW())
       ORDER BY priority DESC`,
      [tenantId]
    );

    const rules = rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      name: r.name,
      active: Boolean(r.active),
      priority: Number(r.priority),
      startAt: r.start_at,
      endAt: r.end_at,
      conditionType: r.condition_type,
      conditionValue: r.condition_value,
      discountType: r.discount_type,
      value: Number(r.value),
      allowStack: Boolean(r.allow_stack),
    }));

    cache.set(cacheKey, { rules, expires: Date.now() + CACHE_TTL });
    return rules;
  },

  async invalidateRulesCache(tenantId: string) {
    cache.delete(`rules:${tenantId}`);
  },

  async getVoucher(tenantId: string, code: string): Promise<DiscountVoucher | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM discount_vouchers 
       WHERE tenant_id = ? AND code = ? AND active = TRUE
       AND (start_at IS NULL OR start_at <= NOW())
       AND (end_at IS NULL OR end_at >= NOW())`,
      [tenantId, code]
    );

    if (rows.length === 0) return null;
    const r = rows[0];

    // Check usage limit
    if (r.usage_limit !== null && Number(r.used_count) >= Number(r.usage_limit)) {
      return null;
    }

    return {
      id: r.id,
      tenantId: r.tenant_id,
      code: r.code,
      active: Boolean(r.active),
      startAt: r.start_at,
      endAt: r.end_at,
      usageLimit: r.usage_limit,
      usedCount: Number(r.used_count),
      minTransactionAmount: Number(r.min_transaction_amount),
      discountType: r.discount_type,
      value: Number(r.value),
    };
  },

  async markVoucherUsed(tenantId: string, voucherId: string, connection?: any) {
    const db = connection || pool;
    await db.query(
      `UPDATE discount_vouchers SET used_count = used_count + 1 WHERE id = ? AND tenant_id = ?`,
      [voucherId, tenantId]
    );
  },

  async saveTransactionDiscounts(
    transactionId: string,
    tenantId: string,
    appliedDiscounts: any[],
    connection?: any
  ) {
    const db = connection || pool;
    const { v4: uuidv4 } = require("uuid");
    
    for (const ad of appliedDiscounts) {
      await db.query(
        `INSERT INTO transaction_discounts (id, transaction_id, tenant_id, discount_rule_id, voucher_id, name, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          transactionId,
          tenantId,
          ad.type === "RULE" ? ad.id : null,
          ad.type === "VOUCHER" ? ad.id : null,
          ad.name,
          ad.amount,
        ]
      );
    }
  }
};
