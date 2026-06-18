-- ============================================
-- Bro-POS Multitenant — MySQL Schema
-- Database: pos_db
-- ============================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  owner_uid VARCHAR(64) NOT NULL,
  status ENUM('trial','active','suspended') DEFAULT 'trial',
  plan VARCHAR(50) DEFAULT 'free',
  branch_count INT DEFAULT 1,
  settings JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tenants_slug (slug),
  INDEX idx_tenants_owner (owner_uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users (global auth)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  default_tenant_id VARCHAR(64),
  is_superadmin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Branches
CREATE TABLE IF NOT EXISTS branches (
  id VARCHAR(64) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Members (tenant membership)
CREATE TABLE IF NOT EXISTS members (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('owner','admin','cashier') DEFAULT 'cashier',
  branch_ids JSON,
  status ENUM('active','disabled') DEFAULT 'active',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_tenant_user (tenant_id, user_id),
  INDEX idx_members_email (email),
  INDEX idx_members_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_categories_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_lower VARCHAR(255),
  price DECIMAL(15,2) NOT NULL DEFAULT 0,
  category_id VARCHAR(64),
  category_name VARCHAR(255),
  image_url TEXT,
  sku VARCHAR(100),
  barcode VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  stock_by_branch JSON,
  total_stock INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_products_tenant (tenant_id),
  INDEX idx_products_category (category_id),
  INDEX idx_products_name (name_lower)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  invoice_code VARCHAR(100) NOT NULL,
  branch_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64),
  user_name VARCHAR(255),
  total_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  change_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_method ENUM('cash','qris','debit') DEFAULT 'cash',
  status ENUM('completed','voided','refunded') DEFAULT 'completed',
  date_key VARCHAR(10),
  month_key VARCHAR(7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_transactions_tenant (tenant_id),
  INDEX idx_transactions_date (date_key),
  INDEX idx_transactions_branch (branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transaction Items
CREATE TABLE IF NOT EXISTS transaction_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id VARCHAR(64) NOT NULL,
  product_id VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  price DECIMAL(15,2) NOT NULL DEFAULT 0,
  qty INT NOT NULL DEFAULT 1,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  INDEX idx_txitems_transaction (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attendance / Shifts
CREATE TABLE IF NOT EXISTS attendance (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  user_name VARCHAR(255),
  role ENUM('owner','admin','cashier'),
  branch_id VARCHAR(64),
  status ENUM('active','closed') DEFAULT 'active',
  opening_cash DECIMAL(15,2),
  closing_cash DECIMAL(15,2),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_attendance_tenant (tenant_id),
  INDEX idx_attendance_user (user_id),
  INDEX idx_attendance_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  tenant_id VARCHAR(64) PRIMARY KEY,
  plan_id VARCHAR(50),
  status ENUM('trial','active','past_due','cancelled') DEFAULT 'trial',
  trial_ends_at TIMESTAMP NULL,
  current_period_start TIMESTAMP NULL,
  current_period_end TIMESTAMP NULL,
  payment_method VARCHAR(50),
  last_payment_at TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Plans (subscription plan definitions)
CREATE TABLE IF NOT EXISTS plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price_idr INT DEFAULT 0,
  billing_interval ENUM('monthly','yearly') DEFAULT 'monthly',
  max_branches INT DEFAULT 1,
  max_products INT DEFAULT 100,
  max_users INT DEFAULT 5,
  transactions_per_month INT DEFAULT 1000,
  feature_multi_branch BOOLEAN DEFAULT FALSE,
  feature_advanced_reports BOOLEAN DEFAULT FALSE,
  feature_excel_export BOOLEAN DEFAULT FALSE,
  feature_api_access BOOLEAN DEFAULT FALSE,
  feature_loyalty BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default plans
INSERT IGNORE INTO plans (id, name, price_idr, billing_interval, max_branches, max_products, max_users, transactions_per_month, feature_multi_branch, feature_advanced_reports, feature_excel_export, feature_api_access, feature_loyalty, is_active)
VALUES
  ('free', 'Free', 0, 'monthly', 1, 100, 3, 500, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE),
  ('pro', 'Pro', 99000, 'monthly', 3, 1000, 10, 10000, TRUE, TRUE, TRUE, FALSE, FALSE, TRUE),
  ('business', 'Business', 249000, 'monthly', 10, 10000, 50, 100000, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE);
