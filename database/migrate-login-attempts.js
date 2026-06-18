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
    console.log("Adding failed_login_count to users table...");
    await conn.query("ALTER TABLE users ADD COLUMN failed_login_count INT DEFAULT 0");
    console.log("OK.");
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log("Column failed_login_count already exists.");
    else throw e;
  }

  try {
    console.log("Adding warning_sent_at to subscriptions table...");
    await conn.query("ALTER TABLE subscriptions ADD COLUMN warning_sent_at TIMESTAMP NULL");
    console.log("OK.");
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log("Column warning_sent_at already exists.");
    else throw e;
  }

  console.log("Migration finished successfully.");
  await conn.end();
}

migrate().catch(console.error);
