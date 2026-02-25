-- Thêm màu '2' cho loại xe 'SH125I'
INSERT INTO dm_xe_mau (ma_loai_xe, ma_mau, status, created_at)
VALUES ('SH125I', '2', true, NOW())
ON CONFLICT (ma_loai_xe, ma_mau) DO UPDATE 
SET status = true, updated_at = NOW();

-- Kiểm tra kết quả
SELECT xm.*, m.ten_mau, hh.ten_hang_hoa as ten_loai
FROM dm_xe_mau xm
LEFT JOIN dm_mau m ON xm.ma_mau = m.ma_mau
LEFT JOIN tm_hang_hoa hh ON xm.ma_loai_xe = hh.ma_hang_hoa
WHERE xm.ma_loai_xe = 'SH125I';
