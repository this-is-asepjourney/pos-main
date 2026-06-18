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
    // 1. Create admin_notifications table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('info','promo','warning') DEFAULT 'info',
        target_tenant_id VARCHAR(64) NULL, -- NULL means all tenants
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notifications_tenant (target_tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table admin_notifications created');

    // 2. Create admin_payment_methods table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS admin_payment_methods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type ENUM('bank_transfer','qris') NOT NULL,
        account_number VARCHAR(100),
        account_name VARCHAR(100),
        qr_image_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table admin_payment_methods created');

    // 3. Create user_feedbacks table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS user_feedbacks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL,
        user_id VARCHAR(64) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status ENUM('pending','investigating','resolved') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_feedbacks_tenant (tenant_id),
        INDEX idx_feedbacks_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table user_feedbacks created');

    console.log('\n🎉 Feature migration completed!');
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
})();
