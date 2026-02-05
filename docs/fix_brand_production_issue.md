# Hướng dẫn Fix lỗi Brand/Nhóm hàng trên Production

## Vấn đề

1. **POST `/api/brand`**: Gửi `ma_nhom_cha: "PT"` nhưng nhận về `ma_nhom_cha: "XE"`
2. **GET `/api/brand?ma_nhom_cha=PT`**: Trả về `data: []` (rỗng) trên production, nhưng local có dữ liệu

## Nguyên nhân

1. Code service sử dụng biến `type` thay vì `parentGroup` → đã fix
2. Database production thiếu dữ liệu seed hoặc migration chưa chạy đầy đủ

## Giải pháp đã thực hiện

### 1. Fix Code (brands.service.js)

✅ Đã sửa phương thức `create()` để sử dụng đúng biến `parentGroup`
✅ Thêm logging để debug trên production

### 2. Tạo Migration Files

- `030_ensure_base_product_groups.sql`: Đảm bảo XE và PT tồn tại
- `031_seed_sample_brands.sql`: Seed dữ liệu mẫu

## Các bước thực hiện trên Render

### Bước 1: Kiểm tra database hiện tại

Kết nối vào database production và chạy:

```sql
-- Kiểm tra xem có dữ liệu không
SELECT ma_nhom, ten_nhom, ma_nhom_cha, status
FROM dm_nhom_hang
ORDER BY
  CASE WHEN ma_nhom_cha IS NULL THEN 0 ELSE 1 END,
  ma_nhom_cha,
  ma_nhom;
```

### Bước 2: Chạy migration 030

```sql
-- Đảm bảo XE và PT tồn tại
INSERT INTO dm_nhom_hang (ma_nhom, ten_nhom, ma_nhom_cha, status, created_at, updated_at)
VALUES
  ('XE', 'Xe máy', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('PT', 'Phụ tùng', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (ma_nhom) DO UPDATE
SET
  ten_nhom = EXCLUDED.ten_nhom,
  status = EXCLUDED.status,
  updated_at = CURRENT_TIMESTAMP;
```

### Bước 3: Seed dữ liệu mẫu (tùy chọn)

Chạy file `031_seed_sample_brands.sql` để có dữ liệu test

### Bước 4: Deploy code mới lên Render

1. Commit và push code đã fix lên GitHub
2. Render sẽ tự động deploy
3. Hoặc trigger manual deploy trên Render dashboard

### Bước 5: Test lại

```bash
# Test POST - Tạo brand mới cho PT
curl -X POST https://motor-manage.onrender.com/api/brand \
  -H "Content-Type: application/json" \
  -d '{"ten_nh": "Test Part", "ma_nhom_cha": "PT"}'

# Kết quả mong đợi: ma_nhom_cha phải là "PT"

# Test GET - Lấy danh sách PT
curl "https://motor-manage.onrender.com/api/brand?ma_nhom_cha=PT&status=all"

# Kết quả mong đợi: Có dữ liệu trong array
```

## Kiểm tra logs trên Render

Sau khi deploy, check logs để xem debug output:

```
[BrandService.getAll] SQL: SELECT id, ma_nhom as ma_nh...
[BrandService.getAll] Params: [ 'PT' ]
[BrandService.getAll] Filters: { ma_nhom_cha: 'PT', status: 'all' }
[BrandService.getAll] Result count: X
```

## Nếu vẫn còn lỗi

### Kiểm tra constraint

```sql
-- Xem unique constraint
SELECT conname, contype, conkey
FROM pg_constraint
WHERE conrelid = 'dm_nhom_hang'::regclass;

-- Nếu có duplicate, xóa trước
DELETE FROM dm_nhom_hang a USING dm_nhom_hang b
WHERE a.id < b.id AND a.ma_nhom = b.ma_nhom;
```

### Reset sequence nếu cần

```sql
-- Kiểm tra sequence hiện tại
SELECT last_value FROM dm_nhom_hang_id_seq;

-- Reset về max id + 1
SELECT setval('dm_nhom_hang_id_seq', (SELECT MAX(id) FROM dm_nhom_hang));
```

## Checklist

- [ ] Code đã được fix và commit
- [ ] Migration 030 đã chạy trên production
- [ ] Seed data đã được thêm (nếu cần)
- [ ] Deploy code mới lên Render
- [ ] Test POST với ma_nhom_cha: "PT" → Kết quả đúng
- [ ] Test GET với ma_nhom_cha=PT → Có dữ liệu
- [ ] Xóa debug logs sau khi fix xong

## Ghi chú

- Sau khi fix xong, nên xóa các dòng `console.log` trong `brands.service.js` để tránh spam logs
- Nếu cần giữ logs, có thể dùng logger thay vì console.log
