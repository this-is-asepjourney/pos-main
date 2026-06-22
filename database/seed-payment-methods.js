const mysql = require('mysql2/promise');
(async () => {
  const conn = await mysql.createConnection({
    host: '34.50.98.189',
    port: 3306,
    user: 'admin',
    password: 'password-kuat',
    database: 'pos_db',
  });
  await conn.execute(`
    INSERT INTO admin_payment_methods (name, type, account_number, account_name, is_active)
    VALUES ('BCA', 'bank_transfer', '1234567890', 'PT POS Nusantara', 1)
  `);
  console.log('Inserted dummy payment method');
  await conn.end();
})();
