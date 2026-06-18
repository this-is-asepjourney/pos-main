const mysql = require("mysql2/promise");

async function migrate() {
  console.log("Connecting to Database...");
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "pos_db",
    port: Number(process.env.MYSQL_PORT) || 3306,
  });

  try {
    console.log("Creating activity_logs table...");
    await conn.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL,
        user_id VARCHAR(64),
        user_name VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        description TEXT,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_logs_tenant (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Table activity_logs created successfully.");
  } catch (e) {
    console.error("Migration failed:", e);
    throw e;
  }

  console.log("Migration finished successfully.");
  await conn.end();
}

migrate().catch(console.error);
