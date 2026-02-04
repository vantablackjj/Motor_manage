# Hướng dẫn Tích hợp Quản lý Quỹ Tiền Mặt

## 📋 Tổng quan

Hệ thống quản lý quỹ tiền mặt được tạo ra để giải quyết vấn đề **phiếu thu chi không được tích hợp với dòng tiền thực tế** của kho.

### Vấn đề hiện tại:

- ❌ Tạo phiếu thu 10 triệu nhưng không cộng vào quỹ tiền mặt
- ❌ Tạo phiếu chi 5 triệu nhưng không trừ khỏi quỹ tiền mặt
- ❌ Không theo dõi được số dư tiền mặt/ngân hàng thực tế của từng kho
- ❌ Không có lịch sử biến động quỹ

### Giải pháp:

- ✅ Tạo bảng `tm_quy_tien_mat` - Quản lý quỹ tiền mặt/ngân hàng của từng kho
- ✅ Tạo bảng `tm_lich_su_quy` - Lịch sử biến động quỹ
- ✅ Trigger tự động cập nhật quỹ khi phê duyệt/hủy phiếu thu chi
- ✅ Service API để quản lý quỹ

## 🚀 Cách triển khai

### Bước 1: Chạy Migration

Có 2 cách để chạy migration:

#### Cách 1: Sử dụng pgAdmin hoặc psql (Khuyến nghị)

1. Mở pgAdmin hoặc psql
2. Kết nối đến database `motor_manage`
3. Chạy file SQL: `src/migrations/021_create_cash_fund_management.sql`

```sql
-- Copy toàn bộ nội dung file 021_create_cash_fund_management.sql và chạy
```

#### Cách 2: Sử dụng script Node.js

```bash
node src/migrations/run_021.js
```

### Bước 2: Kiểm tra Migration thành công

Chạy query sau để kiểm tra:

```sql
-- Kiểm tra bảng đã được tạo
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('tm_quy_tien_mat', 'tm_lich_su_quy');

-- Kiểm tra quỹ mặc định đã được tạo
SELECT ma_kho, loai_quy, ten_quy, so_du_hien_tai
FROM tm_quy_tien_mat
ORDER BY ma_kho, loai_quy;

-- Kiểm tra trigger đã được tạo
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('trg_update_fund_on_approval', 'trg_revert_fund_on_cancel');
```

### Bước 3: Khởi tạo số dư ban đầu (Nếu cần)

Nếu kho của bạn đã có số dư tiền mặt/ngân hàng, cập nhật như sau:

```sql
-- Cập nhật số dư tiền mặt cho kho KHO001
UPDATE tm_quy_tien_mat
SET so_du_hien_tai = 50000000,  -- 50 triệu
    so_du_khoi_tao = 50000000
WHERE ma_kho = 'KHO001' AND loai_quy = 'TIEN_MAT';

-- Cập nhật số dư ngân hàng cho kho KHO001
UPDATE tm_quy_tien_mat
SET so_du_hien_tai = 100000000,  -- 100 triệu
    so_du_khoi_tao = 100000000,
    thong_tin_them = '{"bank_name": "Vietcombank", "account_number": "1234567890"}'::jsonb
WHERE ma_kho = 'KHO001' AND loai_quy = 'NGAN_HANG';
```

## 📊 Cấu trúc Dữ liệu

### Bảng `tm_quy_tien_mat`

| Cột            | Kiểu          | Mô tả                           |
| -------------- | ------------- | ------------------------------- |
| id             | SERIAL        | ID quỹ                          |
| ma_kho         | VARCHAR(50)   | Mã kho                          |
| loai_quy       | ENUM          | TIEN_MAT, NGAN_HANG, VI_DIEN_TU |
| ten_quy        | VARCHAR(255)  | Tên quỹ                         |
| so_du_hien_tai | DECIMAL(15,2) | Số dư hiện tại                  |
| so_du_khoi_tao | DECIMAL(15,2) | Số dư ban đầu                   |
| thong_tin_them | JSONB         | Thông tin ngân hàng, v.v.       |

### Bảng `tm_lich_su_quy`

| Cột            | Kiểu          | Mô tả                 |
| -------------- | ------------- | --------------------- |
| id             | SERIAL        | ID giao dịch          |
| ma_quy         | INTEGER       | ID quỹ                |
| so_phieu_tc    | VARCHAR(50)   | Số phiếu thu/chi      |
| loai_bien_dong | ENUM          | TANG, GIAM            |
| so_tien        | DECIMAL(15,2) | Số tiền biến động     |
| so_du_truoc    | DECIMAL(15,2) | Số dư trước giao dịch |
| so_du_sau      | DECIMAL(15,2) | Số dư sau giao dịch   |

## 🔄 Luồng hoạt động

### Khi tạo phiếu thu/chi:

1. User tạo phiếu thu/chi với trạng thái `NHAP`
2. Phiếu **chưa ảnh hưởng** đến quỹ tiền mặt
3. User gửi duyệt → Trạng thái chuyển sang `GUI_DUYET`

### Khi phê duyệt phiếu:

1. Trigger `trg_update_fund_on_approval` được kích hoạt
2. Hệ thống tìm quỹ phù hợp (theo `ma_kho` và `hinh_thuc`)
3. **Phiếu THU**: Cộng tiền vào quỹ
4. **Phiếu CHI**: Trừ tiền khỏi quỹ
5. Ghi lại lịch sử vào `tm_lich_su_quy`
6. Trạng thái phiếu → `DA_DUYET`

### Khi hủy phiếu đã duyệt:

1. Trigger `trg_revert_fund_on_cancel` được kích hoạt
2. **Hoàn trả** số tiền ngược lại:
   - Phiếu THU đã duyệt → Trừ tiền khỏi quỹ
   - Phiếu CHI đã duyệt → Cộng tiền vào quỹ
3. Ghi lại lịch sử hoàn trả
4. Trạng thái phiếu → `HUY`

## 🎯 Ví dụ Sử dụng

### Tạo phiếu thu 10 triệu:

```javascript
// 1. Tạo phiếu (chưa ảnh hưởng quỹ)
const phieu = await ThuChiService.taoPhieu({
  loai_phieu: "THU",
  so_tien: 10000000,
  hinh_thuc: "TIEN_MAT",
  ma_kho: "KHO001",
  noi_dung: "Thu tiền bán hàng",
  nguoi_lap: "admin",
});
// Quỹ: 50,000,000 (không đổi)

// 2. Gửi duyệt
await ThuChiService.guiDuyet(phieu.so_phieu_tc, 1);
// Quỹ: 50,000,000 (vẫn không đổi)

// 3. Phê duyệt
await ThuChiService.pheDuyet(phieu.so_phieu_tc, 2);
// Quỹ: 60,000,000 ✅ (Đã cộng 10 triệu)
```

### Tạo phiếu chi 5 triệu:

```javascript
// 1. Tạo phiếu chi
const phieu = await ThuChiService.taoPhieu({
  loai_phieu: "CHI",
  so_tien: 5000000,
  hinh_thuc: "TIEN_MAT",
  ma_kho: "KHO001",
  noi_dung: "Chi phí văn phòng",
  nguoi_nhan: "Nguyễn Văn A",
});

// 2. Phê duyệt
await ThuChiService.pheDuyet(phieu.so_phieu_tc, 2);
// Quỹ: 55,000,000 ✅ (60tr - 5tr)
```

### Xem lịch sử quỹ:

```javascript
const QuyTienMatService = require("./services/quyTienMat.service");

// Lấy danh sách quỹ của kho
const danhSachQuy = await QuyTienMatService.getDanhSachQuy("KHO001");

// Lấy lịch sử giao dịch
const lichSu = await QuyTienMatService.getLichSuGiaoDich(quy_id, {
  tu_ngay: "2026-02-01",
  den_ngay: "2026-02-28",
});
```

## ⚠️ Lưu ý quan trọng

1. **Số dư âm**: Hệ thống cho phép số dư âm nhưng sẽ có cảnh báo (WARNING)
2. **Backup dữ liệu**: Trước khi chạy migration, nên backup database
3. **Kiểm tra dữ liệu cũ**: Các phiếu thu/chi cũ (đã duyệt trước khi có hệ thống quỹ) sẽ **không** tự động cập nhật vào quỹ
4. **Khởi tạo số dư**: Cần cập nhật số dư ban đầu cho các quỹ theo thực tế

## 🔧 Troubleshooting

### Lỗi: "relation tm_quy_tien_mat does not exist"

→ Migration chưa chạy thành công. Chạy lại file `021_create_cash_fund_management.sql`

### Lỗi: "column ma_quy does not exist in tm_phieu_thu_chi"

→ Migration chưa thêm cột `ma_quy`. Kiểm tra lại migration

### Số dư quỹ không đúng

→ Kiểm tra lịch sử giao dịch trong `tm_lich_su_quy` để tìm nguyên nhân

```sql
SELECT * FROM tm_lich_su_quy
WHERE ma_quy = 1
ORDER BY ngay_giao_dich DESC;
```

## 📈 Báo cáo Quỹ

Xem tổng quan quỹ của tất cả kho:

```sql
SELECT
  k.ma_kho,
  k.ten_kho,
  SUM(CASE WHEN q.loai_quy = 'TIEN_MAT' THEN q.so_du_hien_tai ELSE 0 END) as tien_mat,
  SUM(CASE WHEN q.loai_quy = 'NGAN_HANG' THEN q.so_du_hien_tai ELSE 0 END) as ngan_hang,
  SUM(q.so_du_hien_tai) as tong_quy
FROM sys_kho k
LEFT JOIN tm_quy_tien_mat q ON k.ma_kho = q.ma_kho AND q.trang_thai = TRUE
WHERE k.status = TRUE
GROUP BY k.ma_kho, k.ten_kho
ORDER BY k.ten_kho;
```

## 🎉 Kết luận

Sau khi triển khai hệ thống này:

- ✅ Mỗi phiếu thu/chi khi được phê duyệt sẽ **tự động** cập nhật quỹ tiền mặt
- ✅ Có thể theo dõi **chính xác** số dư tiền mặt/ngân hàng của từng kho
- ✅ Có **lịch sử đầy đủ** các giao dịch biến động quỹ
- ✅ Hệ thống **tự động hoàn trả** khi hủy phiếu đã duyệt

---

**Tác giả**: Antigravity AI  
**Ngày tạo**: 2026-02-04  
**Phiên bản**: 1.0
