# Hệ Thống Phân Quyền - Role-Based Access Control (RBAC)

## Tổng Quan

Hệ thống phân quyền được thiết kế với **5 vai trò chính** theo yêu cầu mentor:

1. **ADMIN** - Quản trị viên
2. **BAN_HANG** - Nhân viên bán hàng
3. **KHO** - Nhân viên kho
4. **KE_TOAN** - Kế toán
5. **QUAN_LY** - Quản lý

---

## Chi Tiết Phân Quyền Theo Role

### 1. ADMIN - Quản Trị Viên

**Mô tả**: Toàn quyền quản trị hệ thống

**Quyền hạn**:

- ✅ **Quản lý người dùng**: Xem, tạo, sửa, xóa
- ✅ **Quản lý vai trò**: Xem, tạo, sửa, xóa
- ✅ **Quản lý kho**: Xem, tạo, sửa, xóa
- ✅ **Quản lý sản phẩm**: Xem, tạo, sửa, xóa, xem giá vốn
- ✅ **Quản lý đối tác**: Xem, tạo, sửa, xóa
- ✅ **Đơn hàng mua**: Xem, tạo, sửa, xóa, phê duyệt
- ✅ **Đơn hàng bán**: Xem, tạo, sửa, xóa, phê duyệt
- ✅ **Hóa đơn**: Xem, tạo, sửa, xóa
- ✅ **Quản lý kho**: Nhập, xuất, chuyển kho, kiểm kê
- ✅ **Công nợ**: Xem, tạo, sửa, xóa
- ✅ **Thu chi**: Xem, tạo, sửa, xóa, phê duyệt
- ✅ **Báo cáo**: Xem tất cả, xuất file, xem báo cáo tài chính
- ✅ **Cài đặt**: Xem, chỉnh sửa

---

### 2. BAN_HANG - Nhân Viên Bán Hàng

**Mô tả**: Quản lý bán hàng và khách hàng

**Quyền hạn**:

- ✅ **Xem kho**: Chỉ xem danh sách kho
- ✅ **Xem sản phẩm**: Xem thông tin sản phẩm (KHÔNG xem giá vốn)
- ✅ **Quản lý khách hàng**: Xem, tạo mới, sửa thông tin khách hàng
- ✅ **Đơn hàng bán**: Xem, tạo, sửa (KHÔNG xóa, KHÔNG phê duyệt)
- ✅ **Hóa đơn bán**: Xem, tạo (KHÔNG sửa, KHÔNG xóa)
- ✅ **Xuất kho**: Được phép xuất hàng khi bán
- ✅ **Công nợ khách hàng**: Xem, tạo phiếu thu
- ✅ **Thu tiền**: Xem, tạo phiếu thu (KHÔNG phê duyệt)
- ✅ **Báo cáo bán hàng**: Xem, xuất file (KHÔNG xem báo cáo tài chính)

**Hạn chế**:

- ❌ KHÔNG xem giá vốn
- ❌ KHÔNG quản lý nhập hàng
- ❌ KHÔNG phê duyệt đơn hàng
- ❌ KHÔNG xem báo cáo tài chính
- ❌ KHÔNG quản lý người dùng

---

### 3. KHO - Nhân Viên Kho

**Mô tả**: Quản lý nhập xuất kho và tồn kho

**Quyền hạn**:

- ✅ **Xem kho**: Xem danh sách kho
- ✅ **Xem sản phẩm**: Xem thông tin sản phẩm (KHÔNG xem giá vốn)
- ✅ **Xem đối tác**: Chỉ xem thông tin nhà cung cấp/khách hàng
- ✅ **Xem đơn hàng**: Xem đơn mua và đơn bán (KHÔNG tạo, sửa)
- ✅ **Hóa đơn**: Xem, tạo (khi nhập/xuất hàng)
- ✅ **Nhập kho**: Nhập hàng theo đơn mua
- ✅ **Xuất kho**: Xuất hàng theo đơn bán
- ✅ **Chuyển kho**: Chuyển hàng giữa các kho
- ✅ **Báo cáo tồn kho**: Xem, xuất file

**Hạn chế**:

- ❌ KHÔNG tạo/sửa đơn hàng
- ❌ KHÔNG xem giá vốn
- ❌ KHÔNG kiểm kê (chỉ QUAN_LY và KE_TOAN mới kiểm kê)
- ❌ KHÔNG xem công nợ
- ❌ KHÔNG xem thu chi
- ❌ KHÔNG xem báo cáo tài chính

---

### 4. KE_TOAN - Kế Toán

**Mô tả**: Quản lý tài chính, công nợ và báo cáo

**Quyền hạn**:

- ✅ **Xem người dùng**: Xem danh sách nhân viên
- ✅ **Xem kho**: Xem danh sách kho
- ✅ **Quản lý sản phẩm**: Xem, sửa giá (bao gồm giá vốn)
- ✅ **Quản lý đối tác**: Xem, tạo, sửa
- ✅ **Đơn hàng mua**: Xem, sửa, phê duyệt
- ✅ **Đơn hàng bán**: Xem, sửa, phê duyệt
- ✅ **Hóa đơn**: Xem, sửa
- ✅ **Kiểm kê**: Điều chỉnh tồn kho
- ✅ **Công nợ**: Quản lý toàn bộ công nợ
- ✅ **Thu chi**: Quản lý toàn bộ thu chi, phê duyệt
- ✅ **Báo cáo tài chính**: Xem tất cả báo cáo, xuất file
- ✅ **Xem cài đặt**: Xem cấu hình hệ thống

**Hạn chế**:

- ❌ KHÔNG tạo đơn hàng (chỉ sửa và phê duyệt)
- ❌ KHÔNG nhập/xuất/chuyển kho trực tiếp
- ❌ KHÔNG quản lý người dùng
- ❌ KHÔNG sửa cài đặt hệ thống

---

### 5. QUAN_LY - Quản Lý

**Mô tả**: Giám sát và phê duyệt các nghiệp vụ

**Quyền hạn**:

- ✅ **Quản lý người dùng**: Xem, tạo, sửa (KHÔNG xóa)
- ✅ **Xem vai trò**: Xem danh sách vai trò
- ✅ **Quản lý kho**: Xem, tạo, sửa
- ✅ **Quản lý sản phẩm**: Xem, tạo, sửa, xem giá vốn
- ✅ **Quản lý đối tác**: Xem, tạo, sửa, xóa
- ✅ **Đơn hàng mua**: Xem, tạo, sửa, phê duyệt
- ✅ **Đơn hàng bán**: Xem, tạo, sửa, phê duyệt
- ✅ **Hóa đơn**: Xem, tạo, sửa
- ✅ **Quản lý kho**: Nhập, xuất, chuyển kho, kiểm kê
- ✅ **Công nợ**: Xem, tạo, sửa
- ✅ **Thu chi**: Xem, tạo, sửa, phê duyệt
- ✅ **Báo cáo**: Xem tất cả, xuất file, xem báo cáo tài chính
- ✅ **Cài đặt**: Xem, chỉnh sửa

**Hạn chế**:

- ❌ KHÔNG xóa người dùng
- ❌ KHÔNG xóa đơn hàng
- ❌ KHÔNG xóa công nợ/thu chi

---

## Bảng So Sánh Quyền Hạn

| Chức năng              | ADMIN   | BAN_HANG | KHO | KE_TOAN | QUAN_LY    |
| ---------------------- | ------- | -------- | --- | ------- | ---------- |
| **Quản lý người dùng** | ✅ Full | ❌       | ❌  | 👁️ Xem  | ✅ Tạo/Sửa |
| **Xem giá vốn**        | ✅      | ❌       | ❌  | ✅      | ✅         |
| **Tạo đơn bán**        | ✅      | ✅       | ❌  | ❌      | ✅         |
| **Phê duyệt đơn hàng** | ✅      | ❌       | ❌  | ✅      | ✅         |
| **Nhập kho**           | ✅      | ❌       | ✅  | ❌      | ✅         |
| **Xuất kho**           | ✅      | ✅       | ✅  | ❌      | ✅         |
| **Kiểm kê**            | ✅      | ❌       | ❌  | ✅      | ✅         |
| **Quản lý công nợ**    | ✅ Full | 👁️ Xem   | ❌  | ✅ Full | ✅ Tạo/Sửa |
| **Phê duyệt thu chi**  | ✅      | ❌       | ❌  | ✅      | ✅         |
| **Báo cáo tài chính**  | ✅      | ❌       | ❌  | ✅      | ✅         |

---

## Cách Sử Dụng Trong Code

### 1. Sử dụng Role-based Check (Cũ - vẫn hoạt động)

```javascript
const { checkRole } = require("../middleware/roleCheck");
const { ROLES } = require("../config/constants");

// Chỉ ADMIN và QUAN_LY được truy cập
router.get(
  "/sensitive-data",
  authenticate,
  checkRole(ROLES.ADMIN, ROLES.QUAN_LY),
  controller.getData,
);
```

### 2. Sử dụng Permission-based Check (Mới - Khuyến nghị)

```javascript
const { checkPermission } = require("../middleware/permissions");

// Kiểm tra quyền cụ thể
router.post(
  "/products",
  authenticate,
  checkPermission("products", "create"), // Cần quyền tạo sản phẩm
  productController.create,
);

router.get(
  "/products/:id/cost",
  authenticate,
  checkPermission("products", "view_cost"), // Cần quyền xem giá vốn
  productController.getCost,
);
```

### 3. Kiểm tra nhiều quyền (OR logic)

```javascript
const { checkAnyPermission } = require("../middleware/permissions");

// User chỉ cần 1 trong 2 quyền
router.get(
  "/orders",
  authenticate,
  checkAnyPermission(["purchase_orders", "view"], ["sales_orders", "view"]),
  orderController.getList,
);
```

### 4. Kiểm tra nhiều quyền (AND logic)

```javascript
const { checkAllPermissions } = require("../middleware/permissions");

// User phải có cả 2 quyền
router.post(
  "/inventory/adjust",
  authenticate,
  checkAllPermissions(["inventory", "view"], ["inventory", "adjust"]),
  inventoryController.adjust,
);
```

### 5. Kiểm tra trong Controller

```javascript
const { getUserPermissions } = require("../middleware/permissions");

async function createOrder(req, res) {
  const permissions = await getUserPermissions(req.user.id, req.user.role_id);

  // Kiểm tra điều kiện phức tạp
  if (orderType === "purchase" && !permissions.purchase_orders?.create) {
    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền tạo đơn mua hàng",
    });
  }

  // Ẩn giá vốn nếu không có quyền
  if (!permissions.products?.view_cost) {
    delete product.gia_von;
  }

  // ...
}
```

---

## Ví Dụ Áp Dụng Cho Các Routes

### Routes Đơn Hàng Bán (sales_orders)

```javascript
const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/permissions");

// Xem danh sách đơn bán - BAN_HANG, QUAN_LY, KE_TOAN, ADMIN
router.get(
  "/",
  authenticate,
  checkPermission("sales_orders", "view"),
  orderController.getList,
);

// Tạo đơn bán - BAN_HANG, QUAN_LY, ADMIN
router.post(
  "/",
  authenticate,
  checkPermission("sales_orders", "create"),
  orderController.create,
);

// Sửa đơn bán - BAN_HANG, QUAN_LY, KE_TOAN, ADMIN
router.put(
  "/:id",
  authenticate,
  checkPermission("sales_orders", "edit"),
  orderController.update,
);

// Phê duyệt đơn bán - QUAN_LY, KE_TOAN, ADMIN
router.post(
  "/:id/approve",
  authenticate,
  checkPermission("sales_orders", "approve"),
  orderController.approve,
);

// Xóa đơn bán - CHỈ ADMIN
router.delete(
  "/:id",
  authenticate,
  checkPermission("sales_orders", "delete"),
  orderController.delete,
);
```

### Routes Kho (inventory)

```javascript
// Xem tồn kho - Tất cả trừ ADMIN có thể xem
router.get(
  "/stock",
  authenticate,
  checkPermission("inventory", "view"),
  inventoryController.getStock,
);

// Nhập kho - KHO, QUAN_LY, ADMIN
router.post(
  "/import",
  authenticate,
  checkPermission("inventory", "import"),
  inventoryController.import,
);

// Xuất kho - BAN_HANG, KHO, QUAN_LY, ADMIN
router.post(
  "/export",
  authenticate,
  checkPermission("inventory", "export"),
  inventoryController.export,
);

// Chuyển kho - KHO, QUAN_LY, ADMIN
router.post(
  "/transfer",
  authenticate,
  checkPermission("inventory", "transfer"),
  inventoryController.transfer,
);

// Kiểm kê - KE_TOAN, QUAN_LY, ADMIN
router.post(
  "/adjust",
  authenticate,
  checkPermission("inventory", "adjust"),
  inventoryController.adjust,
);
```

### Routes Báo Cáo (reports)

```javascript
// Báo cáo thông thường - Tất cả có thể xem
router.get(
  "/sales",
  authenticate,
  checkPermission("reports", "view"),
  reportController.getSalesReport,
);

// Báo cáo tài chính - KE_TOAN, QUAN_LY, ADMIN
router.get(
  "/financial",
  authenticate,
  checkPermission("reports", "view_financial"),
  reportController.getFinancialReport,
);
```

---

## Migration và Deployment

### 1. Chạy Migration

```bash
# Development
node src/ultils/migrationRunner.js

# Production (Render)
npm run migrate
```

### 2. Kiểm tra Roles đã tạo

```sql
SELECT ma_quyen, ten_quyen, mo_ta FROM sys_role ORDER BY id;
```

### 3. Gán Role cho User

```sql
-- Gán role BAN_HANG cho user
UPDATE sys_user
SET role_id = (SELECT id FROM sys_role WHERE ma_quyen = 'BAN_HANG')
WHERE username = 'nguyen_van_a';

-- Gán role KHO cho user
UPDATE sys_user
SET role_id = (SELECT id FROM sys_role WHERE ma_quyen = 'KHO')
WHERE username = 'tran_thi_b';
```

---

## Lưu Ý Quan Trọng

### 1. Backward Compatibility

- Code cũ sử dụng `checkRole()` vẫn hoạt động bình thường
- Các role cũ (QUAN_LY_CTY, NHAN_VIEN) được map sang role mới
- Không cần refactor toàn bộ code ngay lập tức

### 2. Migration Strategy

- Chạy migration 035 để tạo 5 role mới
- Tất cả user hiện tại sẽ được gán role BAN_HANG (trừ admin)
- Admin cần thủ công gán lại role cho từng user

### 3. Testing

- Test từng role với các chức năng khác nhau
- Đảm bảo BAN_HANG không xem được giá vốn
- Đảm bảo KHO không tạo được đơn hàng
- Đảm bảo KE_TOAN xem được báo cáo tài chính

### 4. Security Best Practices

- Luôn kiểm tra permissions ở cả frontend VÀ backend
- Frontend chỉ ẩn UI, backend mới thực sự chặn
- Log tất cả các hành động quan trọng (audit log)
- Review permissions định kỳ

---

## Troubleshooting

### Lỗi: "Insufficient permissions"

**Nguyên nhân**: User không có quyền cần thiết
**Giải pháp**:

1. Kiểm tra role của user: `SELECT * FROM sys_user WHERE id = ?`
2. Kiểm tra permissions của role: `SELECT permissions FROM sys_role WHERE id = ?`
3. Gán role phù hợp hoặc cập nhật permissions

### Lỗi: "Role not found"

**Nguyên nhân**: User chưa được gán role
**Giải pháp**:

```sql
UPDATE sys_user
SET role_id = (SELECT id FROM sys_role WHERE ma_quyen = 'BAN_HANG')
WHERE id = ?;
```

### User có role cũ (QUAN_LY_CTY, NHAN_VIEN)

**Giải pháp**: Cập nhật vai_tro trong sys_user

```sql
UPDATE sys_user SET vai_tro = 'QUAN_LY' WHERE vai_tro = 'QUAN_LY_CTY';
UPDATE sys_user SET vai_tro = 'BAN_HANG' WHERE vai_tro = 'NHAN_VIEN';
```

---

## Tài Liệu Tham Khảo

- **Migration File**: `src/migrations/035_update_roles_permissions.sql`
- **Constants**: `src/config/constants.js`
- **Middleware**: `src/middleware/permissions.js`
- **Legacy Middleware**: `src/middleware/roleCheck.js`

---

**Cập nhật lần cuối**: 2026-02-11  
**Tác giả**: Antigravity  
**Version**: 1.0
