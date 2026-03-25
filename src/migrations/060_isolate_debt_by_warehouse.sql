-- 060_isolate_debt_by_warehouse.sql
-- Migration to support per-warehouse debt tracking

-- 1. Add ma_kho to tm_cong_no_doi_tac_ct (Detail table)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_cong_no_doi_tac_ct' AND column_name = 'ma_kho') THEN
        ALTER TABLE tm_cong_no_doi_tac_ct ADD COLUMN ma_kho varchar(50);
        -- For existing data, default to KHO001 or first warehouse
        UPDATE tm_cong_no_doi_tac_ct SET ma_kho = 'KHO001' WHERE ma_kho IS NULL;
    END IF;
END $$;

-- 2. Add ma_kho to tm_cong_no_doi_tac (Summary table)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tm_cong_no_doi_tac' AND column_name = 'ma_kho') THEN
        ALTER TABLE tm_cong_no_doi_tac ADD COLUMN ma_kho varchar(50);
        UPDATE tm_cong_no_doi_tac SET ma_kho = 'KHO001' WHERE ma_kho IS NULL;
        
        -- Update Primary Key to include ma_kho to allow separate balances per warehouse
        ALTER TABLE tm_cong_no_doi_tac DROP CONSTRAINT IF EXISTS tm_cong_no_doi_tac_pkey;
        ALTER TABLE tm_cong_no_doi_tac ADD PRIMARY KEY (ma_doi_tac, loai_cong_no, ma_kho);
    END IF;
END $$;

-- 3. Ensure Internal Debt has a clean composite Primary Key
DO $$
BEGIN
    ALTER TABLE tm_cong_no_noi_bo DROP CONSTRAINT IF EXISTS tm_cong_no_noi_bo_pkey;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
ALTER TABLE tm_cong_no_noi_bo ADD PRIMARY KEY (ma_kho_no, ma_kho_co);
