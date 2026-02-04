-- =====================================================
-- MIGRATION 000: BOOTSTRAP BASE TABLES & SEQUENCES
-- Description: Create base tables required for subsequent migrations
-- =====================================================

-- 1. Create sys_user (Base table)
CREATE TABLE IF NOT EXISTS sys_user (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    ho_ten VARCHAR(255),
    email VARCHAR(255),
    dien_thoai VARCHAR(20),
    avatar_url VARCHAR(255),
    status BOOLEAN DEFAULT TRUE,
    role_id INTEGER, -- Updated later in 002
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER,
    deleted_at TIMESTAMP
);

-- 2. Create sys_kho (Base table)
CREATE TABLE IF NOT EXISTS sys_kho (
    id SERIAL PRIMARY KEY,
    ma_kho VARCHAR(50) UNIQUE NOT NULL,
    ten_kho VARCHAR(255) NOT NULL,
    ma_kho_cha VARCHAR(50),
    dia_chi TEXT,
    dien_thoai VARCHAR(20),
    mac_dinh BOOLEAN DEFAULT FALSE,
    chinh BOOLEAN DEFAULT FALSE,
    daily BOOLEAN DEFAULT FALSE,
    status BOOLEAN DEFAULT TRUE,
    ghi_chu TEXT,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Sequences
CREATE SEQUENCE IF NOT EXISTS seq_po START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_hd START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_thu_chi START WITH 1;

-- 4. Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 000: Bootstrap completed successfully';
END $$;
