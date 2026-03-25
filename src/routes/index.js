const express = require("express");
const router = express.Router();

// Import các middleware
const { authenticate } = require("../middleware/auth");
const { warehouseIsolation } = require("../middleware/warehouseIsolation");

// Import các routes
const authRoutes = require("./auth.routes");
const khoRoutes = require("./kho.routes");
const phuTungRoutes = require("./phuTung.routes");
const donHangMuaRoutes = require("./donHangMua.routes");
const hoaDonBanRoutes = require("./hoaDonBan.routes");
const chuyenKhoRoutes = require("./chuyenKho.routes");
const tonKhoRoutes = require("./tonKho.routes");
const xeRoutes = require("./xe.routes");
const brandRoutes = require("./brand.routes");
const nhomHangRoutes = require("./nhomHang.routes");
const loaiHinhRoutes = require("./loaiHinh.routes");
const colorRoutes = require("./color.routes");
const noiSx = require("./noiSx.routes");
const modelCarRoutes = require("./modelCar.routes");
const carColor = require("./carColor.routes");
const thuChi = require("./thuChi.routes");
const khachHangRoutes = require("./khachHang.routes");
const user = require("./user.routes");
const phuTungKhoa = require("./phuTungKhoa.routes");
const congNoRoutes = require("./congNo.routes");
const donHangMuaXeRoutes = require("./donHangMuaXe.routes");
const bulkImportRoutes = require("./bulkImport.routes");
const bulkExportRoutes = require("./bulkExport.routes");
const baoCaoRoutes = require("./baoCao.routes");
const productRoutes = require("./product.routes");
const orderRoutes = require("./order.routes");
const notificationRoutes = require("./notification.routes");
const pushRoutes = require("./push.routes");
const maintenanceRoutes = require("./maintenance.routes");
const dichVuSauBanRoutes = require("./dichVuSauBan.routes");
const logRoutes = require("./log.routes");

// 1. PUBLIC ROUTES (Không cần đăng nhập)
router.use("/auth", authRoutes);
// vapid-public-key là public vì FE cần key trước khi user login để setup subscription
router.get(
  "/push/vapid-public-key",
  require("../controllers/push.controller").getVapidPublicKey,
);

// 2. PROTECTED ROUTES (Cần đăng nhập & Cách ly kho)
router.use(authenticate);
router.use(warehouseIsolation);

router.use("/kho", khoRoutes);
router.use("/phu-tung", phuTungRoutes);
router.use("/ton-kho", tonKhoRoutes);
router.use("/don-hang-mua", donHangMuaRoutes);
router.use("/hoa-don-ban", hoaDonBanRoutes);
router.use("/chuyen-kho", chuyenKhoRoutes);
router.use("/xe", xeRoutes);
router.use("/color", colorRoutes);
router.use("/brand", brandRoutes);
router.use("/nhom-hang", nhomHangRoutes);
router.use("/loai-hinh", loaiHinhRoutes);
router.use("/noi-sx", noiSx);
router.use("/model-car", modelCarRoutes);
router.use("/car-color", carColor);
router.use("/thu-chi", thuChi);
router.use("/khach-hang", khachHangRoutes);
router.use("/users", user);
router.use("/phu-tung-khoa", phuTungKhoa);
router.use("/cong-no", congNoRoutes);
router.use("/don-hang-mua-xe", donHangMuaXeRoutes);
router.use("/import", bulkImportRoutes);
router.use("/export", bulkExportRoutes);
router.use("/bao-cao", baoCaoRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);
router.use("/notifications", notificationRoutes);
router.use("/push", pushRoutes);
router.use("/maintenance", maintenanceRoutes);
router.use("/dich-vu-sau-ban", dichVuSauBanRoutes);
router.use("/logs", logRoutes);

module.exports = router;
