
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
    console.log('Migrating files table...');
    
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS files (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64),
        folder VARCHAR(100) DEFAULT 'uploads',
        original_filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100),
        size INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(64),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_files_tenant (tenant_id),
        INDEX idx_files_folder (folder)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ Table files created successfully');
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
})();
