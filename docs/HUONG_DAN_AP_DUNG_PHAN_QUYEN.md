# Hướng Dẫn Áp Dụng Phân Quyền Vào Routes Hiện Có

## Bước 1: Chạy Migration

```bash
# Local development
node src/ultils/migrationRunner.js

# Hoặc kết nối trực tiếp database và chạy
psql -d your_database -f src/migrations/035_update_roles_permissions.sql
```

## Bước 2: Cập Nhật Routes

### Ví dụ: Cập nhật `order.routes.js`

**Trước khi cập nhật:**

```javascript
const { authenticate } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const { ROLES } = require("../config/constants");

router.get("/", authenticate, orderController.getList);
router.post("/", authenticate, orderController.create);
router.put("/:id", authenticate, orderController.update);
router.delete(
  "/:id",
  authenticate,
  checkRole(ROLES.ADMIN),
  orderController.delete,
);
```

**Sau khi cập nhật:**

```javascript
const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/permissions");

router.get(
  "/",
  authenticate,
  checkPermission("sales_orders", "view"),
  orderController.getList,
);

router.post(
  "/",
  authenticate,
  checkPermission("sales_orders", "create"),
  orderController.create,
);

router.put(
  "/:id",
  authenticate,
  checkPermission("sales_orders", "edit"),
  orderController.update,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("sales_orders", "delete"),
  orderController.delete,
);
```

---

## Mapping Modules và Actions

### Danh sách Modules

```javascript
const MODULES = {
  USERS: "users",
  ROLES: "roles",
  WAREHOUSES: "warehouses",
  PRODUCTS: "products",
  PARTNERS: "partners",
  PURCHASE_ORDERS: "purchase_orders",
  SALES_ORDERS: "sales_orders",
  INVOICES: "invoices",
  INVENTORY: "inventory",
  DEBT: "debt",
  PAYMENTS: "payments",
  REPORTS: "reports",
  SETTINGS: "settings",
};
```

### Danh sách Actions

```javascript
const ACTIONS = {
  VIEW: "view",
  CREATE: "create",
  EDIT: "edit",
  DELETE: "delete",
  APPROVE: "approve",
  IMPORT: "import",
  EXPORT: "export",
  TRANSFER: "transfer",
  ADJUST: "adjust",
  VIEW_COST: "view_cost",
  VIEW_FINANCIAL: "view_financial",
};
```

---

## Áp Dụng Cho Từng Route File

### 1. `donHangMua.routes.js` (Purchase Orders)

```javascript
const { checkPermission } = require("../middleware/permissions");

// GET /api/don-hang-mua
router.get(
  "/",
  authenticate,
  checkPermission("purchase_orders", "view"),
  controller.getList,
);

// POST /api/don-hang-mua
router.post(
  "/",
  authenticate,
  checkPermission("purchase_orders", "create"),
  controller.create,
);

// PUT /api/don-hang-mua/:id
router.put(
  "/:id",
  authenticate,
  checkPermission("purchase_orders", "edit"),
  controller.update,
);

// POST /api/don-hang-mua/:id/approve
router.post(
  "/:id/approve",
  authenticate,
  checkPermission("purchase_orders", "approve"),
  controller.approve,
);

// DELETE /api/don-hang-mua/:id
router.delete(
  "/:id",
  authenticate,
  checkPermission("purchase_orders", "delete"),
  controller.delete,
);
```

### 2. `hoaDonBan.routes.js` (Sales Invoices)

```javascript
const { checkPermission } = require("../middleware/permissions");

router.get(
  "/",
  authenticate,
  checkPermission("invoices", "view"),
  controller.getList,
);

router.post(
  "/",
  authenticate,
  checkPermission("invoices", "create"),
  controller.create,
);

router.put(
  "/:id",
  authenticate,
  checkPermission("invoices", "edit"),
  controller.update,
);
```

### 3. `xe.routes.js` & `phuTung.routes.js` (Products)

```javascript
const {
  checkPermission,
  checkAnyPermission,
} = require("../middleware/permissions");

// Xem sản phẩm
router.get(
  "/",
  authenticate,
  checkPermission("products", "view"),
  controller.getList,
);

// Tạo sản phẩm
router.post(
  "/",
  authenticate,
  checkPermission("products", "create"),
  controller.create,
);

// Xem giá vốn - CHỈ ADMIN, QUAN_LY, KE_TOAN
router.get(
  "/:id/cost",
  authenticate,
  checkPermission("products", "view_cost"),
  controller.getCost,
);
```

### 4. `kho.routes.js` (Warehouses)

```javascript
router.get(
  "/",
  authenticate,
  checkPermission("warehouses", "view"),
  controller.getList,
);

router.post(
  "/",
  authenticate,
  checkPermission("warehouses", "create"),
  controller.create,
);
```

### 5. `tonKho.routes.js` (Inventory)

```javascript
// Xem tồn kho
router.get(
  "/",
  authenticate,
  checkPermission("inventory", "view"),
  controller.getStock,
);

// Nhập kho
router.post(
  "/import",
  authenticate,
  checkPermission("inventory", "import"),
  controller.import,
);

// Xuất kho
router.post(
  "/export",
  authenticate,
  checkPermission("inventory", "export"),
  controller.export,
);

// Chuyển kho
router.post(
  "/transfer",
  authenticate,
  checkPermission("inventory", "transfer"),
  controller.transfer,
);

// Kiểm kê
router.post(
  "/adjust",
  authenticate,
  checkPermission("inventory", "adjust"),
  controller.adjust,
);
```

### 6. `congNo.routes.js` (Debt)

```javascript
router.get(
  "/",
  authenticate,
  checkPermission("debt", "view"),
  controller.getList,
);

router.post(
  "/",
  authenticate,
  checkPermission("debt", "create"),
  controller.create,
);

router.put(
  "/:id",
  authenticate,
  checkPermission("debt", "edit"),
  controller.update,
);
```

### 7. `thuChi.routes.js` (Payments)

```javascript
router.get(
  "/",
  authenticate,
  checkPermission("payments", "view"),
  controller.getList,
);

router.post(
  "/",
  authenticate,
  checkPermission("payments", "create"),
  controller.create,
);

router.post(
  "/:id/approve",
  authenticate,
  checkPermission("payments", "approve"),
  controller.approve,
);
```

### 8. `baoCao.routes.js` (Reports)

```javascript
const {
  checkPermission,
  checkAnyPermission,
} = require("../middleware/permissions");

// Báo cáo thông thường
router.get(
  "/sales",
  authenticate,
  checkPermission("reports", "view"),
  controller.getSalesReport,
);

// Báo cáo tài chính - CHỈ KE_TOAN, QUAN_LY, ADMIN
router.get(
  "/financial",
  authenticate,
  checkPermission("reports", "view_financial"),
  controller.getFinancialReport,
);

router.get(
  "/debt",
  authenticate,
  checkPermission("reports", "view_financial"),
  controller.getDebtReport,
);
```

### 9. `user.routes.js` (Users)

```javascript
router.get(
  "/",
  authenticate,
  checkPermission("users", "view"),
  controller.getList,
);

router.post(
  "/",
  authenticate,
  checkPermission("users", "create"),
  controller.create,
);

router.put(
  "/:id",
  authenticate,
  checkPermission("users", "edit"),
  controller.update,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("users", "delete"),
  controller.delete,
);
```

### 10. `khachHang.routes.js` (Partners/Customers)

```javascript
router.get(
  "/",
  authenticate,
  checkPermission("partners", "view"),
  controller.getList,
);

router.post(
  "/",
  authenticate,
  checkPermission("partners", "create"),
  controller.create,
);

router.put(
  "/:id",
  authenticate,
  checkPermission("partners", "edit"),
  controller.update,
);
```

---

## Xử Lý Trong Controller

### Ẩn giá vốn nếu user không có quyền

```javascript
const { getUserPermissions } = require("../middleware/permissions");

async function getProductDetail(req, res) {
  try {
    const product = await ProductService.getById(req.params.id);

    // Lấy permissions của user
    const permissions = await getUserPermissions(req.user.id, req.user.role_id);

    // Ẩn giá vốn nếu không có quyền
    if (!permissions.products?.view_cost) {
      delete product.gia_von;
      delete product.gia_von_mac_dinh;
    }

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
```

### Kiểm tra quyền phức tạp

```javascript
async function approveOrder(req, res) {
  try {
    const permissions = await getUserPermissions(req.user.id, req.user.role_id);

    const order = await OrderService.getById(req.params.id);

    // Logic phức tạp: Chỉ QUAN_LY mới được phê duyệt đơn > 100 triệu
    if (order.thanh_tien > 100000000 && req.user.vai_tro !== "QUAN_LY") {
      return res.status(403).json({
        success: false,
        message: "Chỉ Quản lý mới được phê duyệt đơn hàng trên 100 triệu",
      });
    }

    // Tiếp tục xử lý...
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
```

---

## Checklist Áp Dụng

- [ ] Chạy migration 035
- [ ] Kiểm tra 5 roles đã được tạo
- [ ] Gán role cho admin user
- [ ] Cập nhật constants.js
- [ ] Thêm middleware permissions.js
- [ ] Cập nhật từng route file:
  - [ ] donHangMua.routes.js
  - [ ] hoaDonBan.routes.js
  - [ ] xe.routes.js
  - [ ] phuTung.routes.js
  - [ ] kho.routes.js
  - [ ] tonKho.routes.js
  - [ ] congNo.routes.js
  - [ ] thuChi.routes.js
  - [ ] baoCao.routes.js
  - [ ] user.routes.js
  - [ ] khachHang.routes.js
- [ ] Test từng role với các chức năng
- [ ] Cập nhật frontend để ẩn/hiện UI theo permissions
- [ ] Document cho team

---

## Testing

### Test Script

```javascript
// test-permissions.js
const axios = require("axios");

const API_URL = "http://localhost:5000/api";

async function testPermissions() {
  // 1. Login as BAN_HANG
  const banHangToken = await login("banhang_user", "password");

  // 2. Test: BAN_HANG có thể tạo đơn bán
  try {
    await axios.post(`${API_URL}/orders`, orderData, {
      headers: { Authorization: `Bearer ${banHangToken}` },
    });
    console.log("✅ BAN_HANG can create sales order");
  } catch (error) {
    console.log("❌ BAN_HANG cannot create sales order");
  }

  // 3. Test: BAN_HANG KHÔNG xem được giá vốn
  try {
    const res = await axios.get(`${API_URL}/products/1/cost`, {
      headers: { Authorization: `Bearer ${banHangToken}` },
    });
    console.log("❌ BAN_HANG can view cost (SHOULD NOT)");
  } catch (error) {
    console.log("✅ BAN_HANG cannot view cost");
  }

  // 4. Test: KHO có thể nhập kho
  const khoToken = await login("kho_user", "password");
  try {
    await axios.post(`${API_URL}/inventory/import`, importData, {
      headers: { Authorization: `Bearer ${khoToken}` },
    });
    console.log("✅ KHO can import inventory");
  } catch (error) {
    console.log("❌ KHO cannot import inventory");
  }

  // ... more tests
}
```

---

## Lưu Ý Quan Trọng

1. **Không xóa code cũ ngay**: Giữ lại `checkRole()` để backward compatible
2. **Test kỹ từng role**: Đảm bảo không có lỗ hổng bảo mật
3. **Frontend cũng cần update**: Ẩn/hiện button/menu theo permissions
4. **Log audit**: Ghi lại các hành động quan trọng
5. **Review định kỳ**: Permissions có thể thay đổi theo yêu cầu nghiệp vụ
