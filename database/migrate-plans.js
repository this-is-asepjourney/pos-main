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
    // 1. Create plans table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS plans (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price_idr INT DEFAULT 0,
        billing_interval ENUM('monthly','yearly') DEFAULT 'monthly',
        max_branches INT DEFAULT 1,
        max_products INT DEFAULT 100,
        max_users INT DEFAULT 5,
        transactions_per_month INT DEFAULT 1000,
        feature_multi_branch BOOLEAN DEFAULT FALSE,
        feature_advanced_reports BOOLEAN DEFAULT FALSE,
        feature_excel_export BOOLEAN DEFAULT FALSE,
        feature_api_access BOOLEAN DEFAULT FALSE,
        feature_loyalty BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table plans created');

    // 2. Seed plans
    const plans = [
      // FREE
      ['free',         'Free',         0,       'monthly', 1,  100,   3,   500,   false, false, false, false, false, true],
      // STARTER
      ['starter',      'Starter',      49000,   'monthly', 1,  500,   5,   2000,  false, true,  false, false, false, true],
      // PRO
      ['pro',          'Pro',          99000,   'monthly', 3,  2000,  15,  10000, true,  true,  true,  false, false, true],
      // PRO YEARLY (discount ~17%)
      ['pro-yearly',   'Pro Tahunan',  990000,  'yearly',  3,  2000,  15,  10000, true,  true,  true,  false, false, true],
      // BUSINESS
      ['business',     'Business',     249000,  'monthly', 10, 10000, 50,  100000,true,  true,  true,  true,  true,  true],
      // BUSINESS YEARLY
      ['business-yearly','Business Tahunan',2490000,'yearly',10,10000,50, 100000,true,  true,  true,  true,  true,  true],
    ];

    for (const [id, name, price, interval, branches, products, users, txMonth, multiBranch, advReports, excelExport, apiAccess, loyalty, isActive] of plans) {
      await conn.execute(
        `INSERT INTO plans (id, name, price_idr, billing_interval, max_branches, max_products, max_users, transactions_per_month,
           feature_multi_branch, feature_advanced_reports, feature_excel_export, feature_api_access, feature_loyalty, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), price_idr=VALUES(price_idr)`,
        [id, name, price, interval, branches, products, users, txMonth,
         multiBranch ? 1 : 0, advReports ? 1 : 0, excelExport ? 1 : 0, apiAccess ? 1 : 0, loyalty ? 1 : 0, isActive ? 1 : 0]
      );
      console.log(`  ✅ Plan "${name}" seeded`);
    }

    // 3. Also create subscriptions table if missing
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        tenant_id VARCHAR(64) PRIMARY KEY,
        plan_id VARCHAR(50),
        status ENUM('trial','active','past_due','cancelled') DEFAULT 'trial',
        trial_ends_at TIMESTAMP NULL,
        current_period_start TIMESTAMP NULL,
        current_period_end TIMESTAMP NULL,
        payment_method VARCHAR(50),
        last_payment_at TIMESTAMP NULL,
        cancelled_at TIMESTAMP NULL,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table subscriptions ready');

    console.log('\n🎉 All done!');
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
})();
