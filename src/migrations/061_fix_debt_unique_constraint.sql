-- 061_fix_debt_unique_constraint.sql
-- Drop the old unique constraints that didn't include ma_kho

DO $$
BEGIN
    -- 1. Drop old unique constraint on tm_cong_no_doi_tac (ma_doi_tac, loai_cong_no)
    -- This was blocking per-warehouse debt tracking
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tm_cong_no_doi_tac_ma_doi_tac_loai_cong_no_key') THEN
        ALTER TABLE tm_cong_no_doi_tac DROP CONSTRAINT tm_cong_no_doi_tac_ma_doi_tac_loai_cong_no_key;
    END IF;

    -- 2. Drop old unique constraint on tm_cong_no_noi_bo (ma_kho_no, ma_kho_co)
    -- This is now covered by the PRIMARY KEY added in migration 060
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tm_cong_no_noi_bo_ma_kho_no_ma_kho_co_key') THEN
        ALTER TABLE tm_cong_no_noi_bo DROP CONSTRAINT tm_cong_no_noi_bo_ma_kho_no_ma_kho_co_key;
    END IF;

    RAISE NOTICE 'Migration 061: Dropped obsolete debt constraints to support warehouse isolation';
END $$;
