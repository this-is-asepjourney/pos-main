/**
 * Migration: Create subscription_requests table
 *
 * Run:  node database/migrate-subscription-requests.js
 */

const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: '34.50.98.189',
    port: 3306,
    user: 'admin',
    password: 'password-kuat',
    database: 'pos_db',
  });

  try {
    // 1. Create subscription_requests table
    console.log('🔄 Creating subscription_requests table...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS subscription_requests (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL,
        tenant_name VARCHAR(255),
        requested_plan_id VARCHAR(50) NOT NULL,
        requested_plan_name VARCHAR(100),
        current_plan_id VARCHAR(50),
        payment_method VARCHAR(50),
        payment_proof_note TEXT,
        amount_idr INT DEFAULT 0,
        status ENUM('pending','approved','rejected','cancelled') DEFAULT 'pending',
        admin_note TEXT,
        approved_by VARCHAR(64),
        approved_at TIMESTAMP NULL,
        rejected_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        INDEX idx_subreq_status (status),
        INDEX idx_subreq_tenant (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table subscription_requests created');

    // 2. Update subscriptions status enum to include pending_approval
    console.log('🔄 Updating subscriptions status enum...');
    try {
      await conn.execute(`
        ALTER TABLE subscriptions
        MODIFY COLUMN status ENUM('trial','active','past_due','cancelled','pending_approval') DEFAULT 'trial'
      `);
      console.log('✅ Updated subscriptions status enum with pending_approval');
    } catch (err) {
      console.log('ℹ️  Subscriptions status enum may already be updated:', err.message);
    }

    console.log('\n🎉 Migration complete!');
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
})();
