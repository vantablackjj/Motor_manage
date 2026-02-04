-- Migration to create dm_mau (Standardized Master Data for Colors)
CREATE TABLE IF NOT EXISTS dm_mau (
    id SERIAL PRIMARY KEY,
    ma_mau VARCHAR(50) UNIQUE NOT NULL,
    ten_mau VARCHAR(100) NOT NULL,
    gia_tri VARCHAR(50), -- Hex code or other identifier
    mac_dinh BOOLEAN DEFAULT FALSE,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dm_mau_ma ON dm_mau(ma_mau);
CREATE INDEX IF NOT EXISTS idx_dm_mau_status ON dm_mau(status);

COMMENT ON TABLE dm_mau IS 'Danh mục màu sắc hàng hóa (Master Data)';

-- Table for mapping available colors to vehicle models
CREATE TABLE IF NOT EXISTS dm_xe_mau (
    id SERIAL PRIMARY KEY,
    ma_loai_xe VARCHAR(50) REFERENCES tm_hang_hoa(ma_hang_hoa),
    ma_mau VARCHAR(50) REFERENCES dm_mau(ma_mau),
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ma_loai_xe, ma_mau)
);

CREATE INDEX IF NOT EXISTS idx_dm_xe_mau_loai ON dm_xe_mau(ma_loai_xe);
CREATE INDEX IF NOT EXISTS idx_dm_xe_mau_mau ON dm_xe_mau(ma_mau);

COMMENT ON TABLE dm_xe_mau IS 'Mapping các màu sắc khả dụng cho từng loại xe';
