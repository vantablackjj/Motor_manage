-- Migration to create dm_loai_hinh and dm_noi_sx (Standardized Master Data)

-- 1. Vehicle Types
CREATE TABLE IF NOT EXISTS dm_loai_hinh (
    id SERIAL PRIMARY KEY,
    ma_lh VARCHAR(50) UNIQUE NOT NULL,
    ten_lh VARCHAR(100) NOT NULL,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dm_loai_hinh_ma ON dm_loai_hinh(ma_lh);
CREATE INDEX IF NOT EXISTS idx_dm_loai_hinh_status ON dm_loai_hinh(status);

-- 2. Origins
CREATE TABLE IF NOT EXISTS dm_noi_sx (
    id SERIAL PRIMARY KEY,
    ma VARCHAR(50) UNIQUE NOT NULL,
    ten_noi_sx VARCHAR(100) NOT NULL,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dm_noi_sx_ma ON dm_noi_sx(ma);
CREATE INDEX IF NOT EXISTS idx_dm_noi_sx_status ON dm_noi_sx(status);

COMMENT ON TABLE dm_loai_hinh IS 'Danh mục loại hình xe (Master Data)';
COMMENT ON TABLE dm_noi_sx IS 'Danh mục nơi sản xuất (Master Data)';
