BEGIN;
SELECT * FROM tm_don_hang WHERE id = 36 FOR UPDATE;
SELECT COALESCE(MAX(stt), 0) + 1 FROM tm_don_hang_chi_tiet WHERE so_don_hang = (SELECT so_don_hang FROM tm_don_hang WHERE id = 36);
INSERT INTO tm_don_hang_chi_tiet (so_don_hang, stt, ma_hang_hoa, so_luong_dat, don_gia, yeu_cau_dac_biet) 
VALUES ((SELECT so_don_hang FROM tm_don_hang WHERE id = 36), 2, 'SP_TEST', 1, 10, '{}');
COMMIT;
