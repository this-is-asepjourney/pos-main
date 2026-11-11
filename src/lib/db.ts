import { Pool, type QueryResult, type QueryResultRow } from "pg";

let pool: Pool | null = null;

export const getDbConfig = () => {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (connectionString) {
    return { connectionString };
  }

  const host =
    process.env.POSTGRES_HOST ||
    process.env.DB_HOST ||
    "192.168.25.101";
  const port = Number(
    process.env.POSTGRES_PORT || process.env.DB_PORT || 5432
  );
  const database =
    process.env.POSTGRES_DB ||
    process.env.DB_DATABASE ||
    process.env.DB_NAME ||
    "pos_db";
  const user =
    process.env.POSTGRES_USER ||
    process.env.DB_USERNAME ||
    process.env.DB_USER ||
    "appuser";
  const password =
    process.env.POSTGRES_PASSWORD ||
    process.env.DB_PASSWORD ||
    "admin12345";

  return { host, port, database, user, password };
};

export const isPostgresConfigured = (): boolean => {
  return Boolean(
    process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_HOST ||
      process.env.DB_HOST
  );
};

export const getPool = (): Pool => {
  if (!pool) {
    const config = getDbConfig();
    pool = new Pool({
      ...config,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on("error", (err) => {
      console.error("[PostgreSQL] Unexpected error on idle client:", err);
    });
  }
  return pool;
};

export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  const p = getPool();
  return p.query<T>(text, params);
};

export const initDb = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const p = getPool();

    // 1. Create tables
    await p.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        email VARCHAR(128) UNIQUE NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'cashier',
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        price NUMERIC(14, 2) NOT NULL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0,
        category_id VARCHAR(64) REFERENCES categories(id) ON DELETE SET NULL,
        category_name VARCHAR(128),
        image_url TEXT,
        sku VARCHAR(64),
        barcode VARCHAR(64),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(64) PRIMARY KEY,
        invoice_code VARCHAR(64) UNIQUE NOT NULL,
        user_id VARCHAR(64),
        user_name VARCHAR(128) NOT NULL,
        total_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
        paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
        change_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
        payment_method VARCHAR(32) NOT NULL DEFAULT 'cash',
        items JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        user_name VARCHAR(128) NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'cashier',
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP WITH TIME ZONE
      );

      CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
      CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
      CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
      CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_attendance_user_status ON attendance(user_id, status);
    `);

    // 2. Seed default users if table is empty
    const usersCount = await p.query("SELECT COUNT(*) FROM users");
    if (Number(usersCount.rows[0].count) === 0) {
      // Default accounts for homelab setup
      await p.query(
        `INSERT INTO users (id, name, email, role, password_hash)
         VALUES 
           ('usr-admin-01', 'Admin Owner', 'admin@pos.local', 'admin', '$2a$10$wKz0b3F.WwIe2h1n6h2Gae3tQe.Z9uB41W8uO4UoQn.YQ92Wd3O5q'),
           ('usr-cashier-01', 'Kasir Utama', 'kasir@pos.local', 'cashier', '$2a$10$wKz0b3F.WwIe2h1n6h2Gae3tQe.Z9uB41W8uO4UoQn.YQ92Wd3O5q')
         ON CONFLICT (email) DO NOTHING;`
      );
    }

    // 3. Seed categories if table is empty
    const catCount = await p.query("SELECT COUNT(*) FROM categories");
    if (Number(catCount.rows[0].count) === 0) {
      await p.query(
        `INSERT INTO categories (id, name)
         VALUES 
           ('cat-coffee', 'Coffee & Espresso'),
           ('cat-tea', 'Tea & Artisan'),
           ('cat-pastry', 'Pastry & Bakery'),
           ('cat-signature', 'Signature Drink')
         ON CONFLICT (id) DO NOTHING;`
      );
    }

    // 4. Seed products if table is empty
    const prodCount = await p.query("SELECT COUNT(*) FROM products");
    if (Number(prodCount.rows[0].count) === 0) {
      await p.query(
        `INSERT INTO products (id, name, price, stock, category_id, category_name, sku, barcode)
         VALUES 
           ('prod-001', 'Americano Double Shot', 22000, 48, 'cat-coffee', 'Coffee & Espresso', 'SKU-AME-01', '8991234001'),
           ('prod-002', 'Caramel Macchiato', 32000, 35, 'cat-coffee', 'Coffee & Espresso', 'SKU-CAR-02', '8991234002'),
           ('prod-003', 'Matcha Latte Oat', 30000, 24, 'cat-signature', 'Signature Drink', 'SKU-MAT-03', '8991234003'),
           ('prod-004', 'Butter Croissant', 25000, 16, 'cat-pastry', 'Pastry & Bakery', 'SKU-CRO-04', '8991234004')
         ON CONFLICT (id) DO NOTHING;`
      );
    }

    return { success: true, message: "Database tables and initial seeds verified successfully." };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error("[PostgreSQL] Init error:", errMessage);
    return { success: false, message: errMessage };
  }
};

