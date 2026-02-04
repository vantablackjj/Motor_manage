# Kế Hoạch Refactor Code: Database Cũ → ERP Mới

## Tổng Quan

Bạn đang có hệ thống với **database cũ** (mỗi loại hàng hóa có bảng riêng) và cần chuyển sang **ERP mới** (tập trung vào bảng chung).

### Database Cũ (Hiện Tại)

```
tm_xe_loai          → Loại xe (catalog)
tm_xe_thuc_te       → Xe thực tế (serial tracking)
tm_phu_tung         → Phụ tùng (catalog + tồn kho)
sys_nhan_hieu       → Nhãn hiệu (Honda, Yamaha)
sys_noi_sx          → Nơi sản xuất
sys_loai_hinh       → Loại hình (xe số, tay ga)
sys_mau             → Màu sắc
tm_xe_mau           → Mapping xe-màu
```

### Database Mới (ERP)

```
dm_nhom_hang        → Phân cấp sản phẩm (XE → HONDA → WAVE_ALPHA)
tm_hang_hoa         → Catalog chung (tất cả loại hàng hóa)
tm_hang_hoa_serial  → Tracking serial (xe, laptop, điện thoại)
tm_hang_hoa_ton_kho → Tracking batch (phụ tùng, vật tư)
tm_hang_hoa_lich_su → Lịch sử chung
```

---

## Mapping Dữ Liệu: Cũ → Mới

### 1. Loại Xe (tm_xe_loai) → Hàng Hóa (tm_hang_hoa)

**Cũ:**

```sql
tm_xe_loai (
  ma_loai,      -- WAVE_ALPHA
  ten_loai,     -- Wave Alpha 110
  ma_nh,        -- HONDA
  noi_sx,       -- VN
  loai_hinh,    -- XE_SO
  gia_nhap,
  gia_ban,
  phan_khoi
)
```

**Mới:**

```sql
tm_hang_hoa (
  ma_hang_hoa,          -- WAVE_ALPHA (từ ma_loai)
  ten_hang_hoa,         -- Wave Alpha 110 (từ ten_loai)
  ma_nhom_hang,         -- HONDA (từ dm_nhom_hang)
  loai_quan_ly,         -- 'SERIAL'
  gia_von_mac_dinh,     -- gia_nhap
  gia_ban_mac_dinh,     -- gia_ban
  thong_so_ky_thuat     -- JSONB: {phan_khoi, noi_sx, loai_hinh}
)
```

**JSONB `thong_so_ky_thuat`:**

```json
{
  "phan_khoi": 110,
  "noi_sx": "Việt Nam",
  "loai_hinh": "Xe số",
  "xuat_xu": "Việt Nam"
}
```

### 2. Xe Thực Tế (tm_xe_thuc_te) → Serial (tm_hang_hoa_serial)

**Cũ:**

```sql
tm_xe_thuc_te (
  xe_key,
  ma_loai_xe,
  ma_mau,
  so_khung,
  so_may,
  ma_kho_hien_tai,
  trang_thai
)
```

**Mới:**

```sql
tm_hang_hoa_serial (
  ma_serial,            -- xe_key
  ma_hang_hoa,          -- ma_loai_xe
  serial_identifier,    -- so_khung
  ma_kho_hien_tai,
  trang_thai,
  thuoc_tinh_rieng      -- JSONB: {mau_sac, so_may}
)
```

**JSONB `thuoc_tinh_rieng`:**

```json
{
  "so_khung": "RLHPC38E0M0123456",
  "so_may": "PC38E-0123456",
  "mau_sac": {
    "ma": "RED_BLACK",
    "ten": "Đỏ đen",
    "hex": "#FF0000"
  }
}
```

### 3. Phụ Tùng (tm_phu_tung) → Hàng Hóa (tm_hang_hoa)

**Cũ:**

```sql
tm_phu_tung (
  ma_pt,
  ten_pt,
  don_vi_tinh,
  nhom_pt,
  gia_nhap,
  gia_ban
)
```

**Mới:**

```sql
tm_hang_hoa (
  ma_hang_hoa,          -- ma_pt
  ten_hang_hoa,         -- ten_pt
  ma_nhom_hang,         -- 'PT' hoặc nhom_pt
  loai_quan_ly,         -- 'BATCH'
  don_vi_tinh,
  gia_von_mac_dinh,     -- gia_nhap
  gia_ban_mac_dinh      -- gia_ban
)
```

### 4. Nhãn Hiệu (sys_nhan_hieu) → Nhóm Hàng (dm_nhom_hang)

**Cũ:**

```sql
sys_nhan_hieu (
  ma_nh,      -- HONDA
  ten_nh      -- Honda
)
```

**Mới:**

```sql
dm_nhom_hang (
  ma_nhom,        -- HONDA
  ten_nhom,       -- Honda
  ma_nhom_cha,    -- 'XE'
  status
)
```

**Hierarchy:**

```
XE (Root)
├── HONDA (Brand)
│   ├── WAVE_ALPHA (Model)
│   └── FUTURE (Model)
└── YAMAHA (Brand)
    └── EXCITER (Model)
```

### 5. Màu Sắc (sys_mau) → JSONB

**Cũ:**

```sql
sys_mau (
  ma_mau,
  ten_mau,
  gia_tri
)
```

**Mới:** Không còn bảng riêng, lưu trong JSONB

```json
// tm_hang_hoa_serial.thuoc_tinh_rieng
{
  "mau_sac": {
    "ma": "RED_BLACK",
    "ten": "Đỏ đen",
    "hex": "#FF0000"
  }
}
```

---

## Refactor Code: Service Layer

### File Cần Refactor

| File Cũ               | Trạng Thái      | File Mới                                  |
| --------------------- | --------------- | ----------------------------------------- |
| `xe.service.js`       | ✅ Đã đúng      | Giữ nguyên (đã dùng `tm_hang_hoa_serial`) |
| `phuTung.service.js`  | ✅ Đã đúng      | Giữ nguyên (đã dùng `tm_hang_hoa`)        |
| `modelCar.service.js` | ❌ Cần refactor | → `productCatalog.service.js`             |
| `brands.service.js`   | ✅ Đã đúng      | Giữ nguyên (đã dùng `dm_nhom_hang`)       |
| `color.service.js`    | ❌ Deprecate    | → Xóa (dùng JSONB)                        |
| `carColor.service.js` | ❌ Deprecate    | → Xóa (dùng JSONB)                        |
| `noiSx.service.js`    | ❌ Deprecate    | → Lưu trong JSONB                         |
| `loaiHinh.service.js` | ❌ Deprecate    | → Lưu trong JSONB                         |

---

## Chi Tiết Refactoring

### 1. Refactor `modelCar.service.js` → `productCatalog.service.js`

**Cũ (modelCar.service.js):**

```javascript
// ❌ Query từ nhiều bảng riêng biệt
static async getAll(filters = {}) {
  let sql = `
    SELECT
      lx.ma_loai, lx.ten_loai,
      nh.ma_nh, nh.ten_nh,
      nsx.ten_noi_sx,
      lh.ten_lh,
      lx.gia_nhap, lx.gia_ban
    FROM tm_xe_loai lx
    JOIN sys_nhan_hieu nh ON lx.ma_nh = nh.ma_nh
    JOIN sys_noi_sx nsx ON lx.noi_sx = nsx.ma
    JOIN sys_loai_hinh lh ON lx.loai_hinh = lh.ma_lh
  `;
  // ...
}
```

**Mới (productCatalog.service.js):**

```javascript
// ✅ Query từ bảng chung + JSONB
static async getAll(filters = {}) {
  let sql = `
    SELECT
      hh.ma_hang_hoa as ma_loai,
      hh.ten_hang_hoa as ten_loai,
      hh.ma_nhom_hang as ma_nh,
      nh.ten_nhom as ten_nh,
      hh.thong_so_ky_thuat->>'noi_sx' as ten_noi_sx,
      hh.thong_so_ky_thuat->>'loai_hinh' as ten_lh,
      hh.gia_von_mac_dinh as gia_nhap,
      hh.gia_ban_mac_dinh as gia_ban,
      get_nhom_hang_path(hh.ma_nhom_hang) as hierarchy_path
    FROM tm_hang_hoa hh
    LEFT JOIN dm_nhom_hang nh ON hh.ma_nhom_hang = nh.ma_nhom
    WHERE hh.loai_quan_ly = 'SERIAL'
      AND hh.status = TRUE
  `;
  // ...
}
```

### 2. Refactor `themXe.service.js` (Thêm Xe)

**Cũ:**

```javascript
// ❌ Tạo xe với màu từ bảng riêng
const { ma_loai_xe, ma_mau, so_khung, so_may } = data;

// Insert vào tm_xe_thuc_te
await client.query(
  `
  INSERT INTO tm_xe_thuc_te (xe_key, ma_loai_xe, ma_mau, so_khung, so_may)
  VALUES ($1, $2, $3, $4, $5)
`,
  [xe_key, ma_loai_xe, ma_mau, so_khung, so_may],
);
```

**Mới:**

```javascript
// ✅ Tạo xe với màu trong JSONB
const { ma_hang_hoa, mau_sac, so_khung, so_may } = data;

// Lấy thông tin màu (nếu có từ inventory cũ)
const colorInfo = mau_sac || { ma: "CUSTOM", ten: "Tùy chỉnh", hex: null };

// Insert vào tm_hang_hoa_serial
await client.query(
  `
  INSERT INTO tm_hang_hoa_serial (
    ma_serial, ma_hang_hoa, serial_identifier,
    thuoc_tinh_rieng, trang_thai
  )
  VALUES ($1, $2, $3, $4, 'TON_KHO')
`,
  [
    xe_key,
    ma_hang_hoa,
    so_khung,
    JSON.stringify({
      so_khung,
      so_may,
      mau_sac: colorInfo,
    }),
  ],
);
```

### 3. Refactor Filter/Search

**Cũ:**

```javascript
// ❌ Filter theo bảng riêng
if (filters.ma_nh) {
  sql += ` AND lx.ma_nh = $${params.length + 1}`;
  params.push(filters.ma_nh);
}
```

**Mới:**

```javascript
// ✅ Filter theo hierarchy
if (filters.ma_nh) {
  sql += ` AND hh.ma_nhom_hang IN (
    SELECT ma_nhom FROM get_nhom_hang_children($${params.length + 1})
  )`;
  params.push(filters.ma_nh);
}

// Filter JSONB
if (filters.loai_hinh) {
  sql += ` AND hh.thong_so_ky_thuat->>'loai_hinh' = $${params.length + 1}`;
  params.push(filters.loai_hinh);
}
```

---

## Migration Script: Dữ Liệu Cũ → Mới

Tạo file `src/migrations/009_migrate_old_data_to_erp.sql`:

```sql
-- =====================================================
-- MIGRATION 009: MIGRATE OLD DATA TO ERP STRUCTURE
-- =====================================================

BEGIN;

-- 1. Migrate Brands (sys_nhan_hieu → dm_nhom_hang)
INSERT INTO dm_nhom_hang (ma_nhom, ten_nhom, ma_nhom_cha, status)
SELECT
  nh.ma_nh as ma_nhom,
  nh.ten_nh as ten_nhom,
  'XE' as ma_nhom_cha,
  nh.status
FROM sys_nhan_hieu nh
WHERE NOT EXISTS (
  SELECT 1 FROM dm_nhom_hang WHERE ma_nhom = nh.ma_nh
);

-- 2. Migrate Vehicle Models (tm_xe_loai → tm_hang_hoa)
INSERT INTO tm_hang_hoa (
  ma_hang_hoa, ten_hang_hoa, ma_nhom_hang, loai_quan_ly,
  gia_von_mac_dinh, gia_ban_mac_dinh, don_vi_tinh,
  thong_so_ky_thuat, status
)
SELECT
  lx.ma_loai as ma_hang_hoa,
  lx.ten_loai as ten_hang_hoa,
  lx.ma_nh as ma_nhom_hang,
  'SERIAL' as loai_quan_ly,
  lx.gia_nhap as gia_von_mac_dinh,
  lx.gia_ban as gia_ban_mac_dinh,
  'Chiếc' as don_vi_tinh,
  jsonb_build_object(
    'phan_khoi', lx.phan_khoi,
    'noi_sx', nsx.ten_noi_sx,
    'loai_hinh', lh.ten_lh,
    'gia_thue', lx.gia_thue,
    'vat', lx.vat
  ) as thong_so_ky_thuat,
  lx.status
FROM tm_xe_loai lx
LEFT JOIN sys_noi_sx nsx ON lx.noi_sx = nsx.ma
LEFT JOIN sys_loai_hinh lh ON lx.loai_hinh = lh.ma_lh
WHERE NOT EXISTS (
  SELECT 1 FROM tm_hang_hoa WHERE ma_hang_hoa = lx.ma_loai
);

-- 3. Migrate Vehicle Instances (tm_xe_thuc_te → tm_hang_hoa_serial)
INSERT INTO tm_hang_hoa_serial (
  ma_serial, ma_hang_hoa, serial_identifier,
  ma_kho_hien_tai, trang_thai, locked,
  thuoc_tinh_rieng, ngay_nhap_kho
)
SELECT
  x.xe_key as ma_serial,
  x.ma_loai_xe as ma_hang_hoa,
  x.so_khung as serial_identifier,
  x.ma_kho_hien_tai,
  x.trang_thai,
  x.locked,
  jsonb_build_object(
    'so_khung', x.so_khung,
    'so_may', x.so_may,
    'mau_sac', jsonb_build_object(
      'ma', x.ma_mau,
      'ten', m.ten_mau,
      'hex', m.gia_tri
    )
  ) as thuoc_tinh_rieng,
  x.ngay_nhap
FROM tm_xe_thuc_te x
LEFT JOIN sys_mau m ON x.ma_mau = m.ma_mau
WHERE NOT EXISTS (
  SELECT 1 FROM tm_hang_hoa_serial WHERE ma_serial = x.xe_key
);

-- 4. Mark old tables as deprecated
COMMENT ON TABLE tm_xe_loai IS 'DEPRECATED: Migrated to tm_hang_hoa';
COMMENT ON TABLE tm_xe_thuc_te IS 'DEPRECATED: Migrated to tm_hang_hoa_serial';
COMMENT ON TABLE sys_nhan_hieu IS 'DEPRECATED: Migrated to dm_nhom_hang';
COMMENT ON TABLE sys_mau IS 'DEPRECATED: Colors now in JSONB';
COMMENT ON TABLE tm_xe_mau IS 'DEPRECATED: Colors now in JSONB';

COMMIT;
```

---

## Checklist Refactoring

### Phase 1: Database Migration

- [ ] Run migration script `009_migrate_old_data_to_erp.sql`
- [ ] Verify data migrated correctly
- [ ] Create backup of old tables
- [ ] Test queries on new structure

### Phase 2: Service Layer

- [ ] Refactor `modelCar.service.js` → `productCatalog.service.js`
- [ ] Update `themXe.service.js` to use JSONB colors
- [ ] Update `xe.service.js` filters (already mostly correct)
- [ ] Update `phuTung.service.js` (already mostly correct)
- [ ] Deprecate `color.service.js`
- [ ] Deprecate `carColor.service.js`
- [ ] Deprecate `noiSx.service.js`
- [ ] Deprecate `loaiHinh.service.js`

### Phase 3: Controller Layer

- [ ] Update `modelCar.controller.js`
- [ ] Update `themXe.controller.js`
- [ ] Update `color.controller.js` (mark deprecated)

### Phase 4: Routes

- [ ] Update `/api/models` routes
- [ ] Update `/api/vehicles` routes
- [ ] Deprecate `/api/colors` routes

### Phase 5: Frontend

- [ ] Update vehicle model selection (use hierarchy)
- [ ] Update color picker (use JSONB)
- [ ] Update filters (use JSONB queries)

---

## Timeline

- **Phase 1 (Database)**: 1 day
- **Phase 2 (Services)**: 2-3 days
- **Phase 3 (Controllers)**: 1 day
- **Phase 4 (Routes)**: 0.5 day
- **Phase 5 (Frontend)**: 2-3 days
- **Testing**: 2 days

**Total**: ~2 weeks

---

## Next Steps

1. Review kế hoạch này
2. Chạy migration script
3. Test dữ liệu đã migrate
4. Bắt đầu refactor từng service
5. Update frontend components

---

**Created**: 2026-01-26  
**Status**: Ready for implementation
