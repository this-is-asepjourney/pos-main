const mysql = require("mysql2/promise");

async function migrate() {
  console.log("Mulai migrasi Pricing Engine & Flexible Discounts...");
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: Number(process.env.MYSQL_PORT) || 3306,
  });

  try {
    // 1. Tambah kolom pajak pada tenants
    console.log("Menambahkan opsi pajak pada tabel tenants...");
    const [tenantCols] = await pool.query(`SHOW COLUMNS FROM tenants LIKE 'tax_rate'`);
    if (tenantCols.length === 0) {
      await pool.query(`ALTER TABLE tenants ADD COLUMN tax_rate DECIMAL(5,2) DEFAULT 0`);
      await pool.query(`ALTER TABLE tenants ADD COLUMN tax_inclusive BOOLEAN DEFAULT FALSE`);
      console.log("✔ Kolom tax_rate & tax_inclusive berhasil ditambahkan pada tabel tenants");
    } else {
      console.log("✔ Kolom pajak pada tenants sudah ada");
    }

    // 2. Modifikasi tabel transactions
    console.log("Menambahkan kolom kalkulasi pada tabel transactions...");
    const [txCols] = await pool.query(`SHOW COLUMNS FROM transactions LIKE 'subtotal'`);
    if (txCols.length === 0) {
      await pool.query(`
        ALTER TABLE transactions 
        ADD COLUMN subtotal DECIMAL(15,2) DEFAULT 0 AFTER user_name,
        ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0 AFTER total_price,
        ADD COLUMN discount_amount DECIMAL(15,2) DEFAULT 0 AFTER tax_amount,
        ADD COLUMN discount_snapshot JSON AFTER discount_amount
      `);
      
      // Update data lama: set subtotal = total_price
      await pool.query(`UPDATE transactions SET subtotal = total_price WHERE subtotal = 0`);
      
      console.log("✔ Kolom kalkulasi berhasil ditambahkan pada tabel transactions");
    } else {
      console.log("✔ Kolom kalkulasi pada transactions sudah ada");
    }

    // 3. Buat tabel discount_rules
    console.log("Membuat tabel discount_rules...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS discount_rules (
        id VARCHAR(50) PRIMARY KEY,
        tenant_id VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        priority INT DEFAULT 0,
        start_at DATETIME NULL,
        end_at DATETIME NULL,
        condition_type ENUM('MIN_SUBTOTAL', 'MIN_QTY', 'CATEGORY', 'PRODUCT', 'TIME', 'DAY', 'MEMBER', 'NONE') DEFAULT 'NONE',
        condition_value JSON NULL,
        discount_type ENUM('PERCENTAGE', 'FIXED', 'SET_PRICE') DEFAULT 'PERCENTAGE',
        value DECIMAL(15,2) NOT NULL,
        allow_stack BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tenant_active (tenant_id, active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✔ Tabel discount_rules berhasil dibuat");

    // 4. Buat tabel discount_vouchers
    console.log("Membuat tabel discount_vouchers...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS discount_vouchers (
        id VARCHAR(50) PRIMARY KEY,
        tenant_id VARCHAR(50) NOT NULL,
        code VARCHAR(50) NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        start_at DATETIME NULL,
        end_at DATETIME NULL,
        usage_limit INT NULL,
        used_count INT DEFAULT 0,
        min_transaction_amount DECIMAL(15,2) DEFAULT 0,
        discount_type ENUM('PERCENTAGE', 'FIXED', 'SET_PRICE') DEFAULT 'PERCENTAGE',
        value DECIMAL(15,2) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY idx_tenant_code (tenant_id, code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✔ Tabel discount_vouchers berhasil dibuat");

    // 5. Buat tabel transaction_discounts (log diskon untuk relasional)
    console.log("Membuat tabel transaction_discounts...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transaction_discounts (
        id VARCHAR(50) PRIMARY KEY,
        transaction_id VARCHAR(50) NOT NULL,
        tenant_id VARCHAR(50) NOT NULL,
        discount_rule_id VARCHAR(50) NULL,
        voucher_id VARCHAR(50) NULL,
        name VARCHAR(100) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_transaction (transaction_id),
        INDEX idx_tenant (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✔ Tabel transaction_discounts berhasil dibuat");

    console.log("🎉 Migrasi Pricing Engine selesai dengan sukses!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Terjadi kesalahan saat migrasi:", error);
    process.exit(1);
  }
}

migrate();
