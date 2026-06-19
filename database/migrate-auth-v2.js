const mysql = require("mysql2/promise");

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "pos_db",
  });

  console.log("Connected to database. Running Auth v2 migration...");

  try {
    // 1. Modify Users table
    console.log("Modifying users table...");
    const addCol = async (table, colDef) => {
      try {
        await connection.query(`ALTER TABLE ${table} ADD COLUMN ${colDef}`);
      } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') throw err;
      }
    };
    await addCol('users', "password_algo ENUM('bcrypt', 'argon2id') DEFAULT 'bcrypt' AFTER password_hash");
    await addCol('users', "failed_login_count INT DEFAULT 0");
    await addCol('users', "locked_until TIMESTAMP NULL");
    await addCol('users', "last_failed_at TIMESTAMP NULL");
    await addCol('users', "auth_version INT DEFAULT 1");

    // 2. Create Sessions table
    console.log("Creating sessions table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        tenant_id VARCHAR(64),
        role VARCHAR(50),
        branch_ids JSON,
        device_info TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        revoked BOOLEAN DEFAULT FALSE,
        refresh_token_hash VARCHAR(255) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_sessions_user (user_id),
        INDEX idx_sessions_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Create Auth Logs table
    console.log("Creating auth_logs table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS auth_logs (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64),
        tenant_id VARCHAR(64),
        action VARCHAR(50) NOT NULL,
        ip_address VARCHAR(45),
        device_info TEXT,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_auth_logs_user (user_id),
        INDEX idx_auth_logs_tenant (tenant_id),
        INDEX idx_auth_logs_action (action)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log("Auth v2 migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await connection.end();
  }
}

migrate();
