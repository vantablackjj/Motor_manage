-- Check history records for vehicles
SELECT COUNT(*) as history_count
FROM tm_hang_hoa_lich_su 
WHERE ngay_giao_dich >= '2026-02-01' 
  AND ngay_giao_dich <= '2026-02-10';

-- Check by transaction type
SELECT loai_giao_dich, COUNT(*) as count 
FROM tm_hang_hoa_lich_su 
WHERE ngay_giao_dich >= '2026-02-01' 
  AND ngay_giao_dich <= '2026-02-10'
GROUP BY loai_giao_dich;

-- Check purchase orders
SELECT COUNT(*) as po_count
FROM tm_don_hang 
WHERE loai_don_hang = 'MUA_HANG' 
  AND ngay_dat_hang >= '2026-02-01' 
  AND ngay_dat_hang <= '2026-02-10'
  AND trang_thai = 'HOAN_THANH';

-- Check vehicles received
SELECT COUNT(*) as vehicle_count
FROM tm_hang_hoa_serial 
WHERE ngay_nhap_kho >= '2026-02-01' 
  AND ngay_nhap_kho <= '2026-02-10';

-- Test the actual query from nhapXuatXe
SELECT COUNT(*) as result_count
FROM tm_hang_hoa_lich_su ls
LEFT JOIN sys_kho k_xuat ON ls.ma_kho_xuat = k_xuat.ma_kho
LEFT JOIN tm_don_hang po ON ls.so_chung_tu = po.so_don_hang 
LEFT JOIN dm_doi_tac ncc_nhap ON po.ma_ben_xuat = ncc_nhap.ma_doi_tac
LEFT JOIN sys_kho k_nhap ON ls.ma_kho_nhap = k_nhap.ma_kho
LEFT JOIN tm_hoa_don hd ON ls.so_chung_tu = hd.so_hoa_don 
LEFT JOIN dm_doi_tac kh_ban ON hd.ma_ben_nhap = kh_ban.ma_doi_tac
LEFT JOIN tm_hang_hoa_serial x ON ls.ma_serial = x.ma_serial
JOIN tm_hang_hoa pt ON ls.ma_hang_hoa = pt.ma_hang_hoa
WHERE (pt.ma_nhom_hang IN (SELECT ma_nhom FROM get_nhom_hang_children('XE')) OR pt.ma_nhom_hang = 'XE')
  AND ls.ngay_giao_dich >= '2026-02-01'
  AND ls.ngay_giao_dich < ('2026-02-10'::date + 1);
