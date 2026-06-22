const mysql = require('mysql2/promise');
(async () => {
  const conn = await mysql.createConnection({
    host: '34.50.98.189',
    port: 3306,
    user: 'admin',
    password: 'password-kuat',
    database: 'pos_db',
  });
  const [rows] = await conn.execute('SELECT * FROM payment_methods');
  console.log(rows);
  await conn.end();
})();
