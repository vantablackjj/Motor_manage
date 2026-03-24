SELECT id, so_don_hang, stt, ma_hang_hoa FROM tm_don_hang_chi_tiet WHERE so_don_hang = (SELECT so_don_hang FROM tm_don_hang WHERE id = 36);
