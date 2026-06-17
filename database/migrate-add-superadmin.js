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
    const [rows] = await conn.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='pos_db' AND TABLE_NAME='users' AND COLUMN_NAME='is_superadmin'"
    );

    if (rows.length === 0) {
      await conn.execute('ALTER TABLE users ADD COLUMN is_superadmin BOOLEAN DEFAULT FALSE');
      console.log('✅ Column is_superadmin added successfully!');
    } else {
      console.log('ℹ️  Column is_superadmin already exists, no changes needed.');
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
})();
