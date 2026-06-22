const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '34.50.98.189',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'admin',
    password: process.env.MYSQL_PASSWORD || 'password-kuat',
    database: process.env.MYSQL_DATABASE || 'pos_db',
  });

  try {
    console.log('Migrating subscription_requests table...');
    
    await conn.execute(`
      ALTER TABLE subscription_requests 
      ADD COLUMN payment_proof_url VARCHAR(1024) NULL AFTER payment_proof_note
    `);
    
    console.log('✅ Column payment_proof_url added successfully');
    
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ Column payment_proof_url already exists');
    } else {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
  } finally {
    await conn.end();
  }
})();
