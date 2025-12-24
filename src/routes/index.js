const express = require("express");
const router = express.Router();
// Import các routes
const authRoutes = require("./auth.routes");
const khoRoutes = require("./kho.routes");
const phuTungRoutes = require("./phuTung.routes");
const donHangMuaRoutes = require("./donHangMua.routes");
const hoaDonBanRoutes = require("./hoaDonBan.routes");
const chuyenKhoRoutes = require("./chuyenKho.routes");
const tonKhoRoutes = require("./tonKho.routes");
const xeRoutes = require("./xe.routes");
const brandRoutes = require("./brand.routes")
const loaiHinhRoutes = require("./loaiHinh.routes")
const colorRoutes = require("./color.routes")
const noiSx = require("./noiSx.routes")
const modelCarRoutes = require("./modelCar.routes")
const carColor = require("./carColor.routes")
const taoPhieuXeMoi = require("./hoaDonMuaXe.routes")
const themXe = require("./donHangMuaXe.routes")
const thuChi = require("./thuChi.routes")
const khachHangRoutes = require("./khachHang.routes")
const user = require("./user.routes")
// Mount routes
router.use("/auth", authRoutes);
router.use("/kho", khoRoutes);
router.use("/phu-tung", phuTungRoutes);
router.use("/ton-kho", tonKhoRoutes);
router.use("/don-hang-mua", donHangMuaRoutes);
router.use("/hoa-don-ban", hoaDonBanRoutes);
router.use("/chuyen-kho", chuyenKhoRoutes);
router.use("/xe", xeRoutes);
router.use("/color",colorRoutes)
router.use("/brand",brandRoutes)
router.use("/loai-hinh",loaiHinhRoutes)
router.use("/noi-sx",noiSx)
router.use("/model-car",modelCarRoutes)
router.use("/hoa-don-mua-xe",taoPhieuXeMoi)
router.use("/car-color",carColor)
router.use("/don-hang-mua-xe",themXe)
router.use("/thu-chi",thuChi)
router.use("/khach-hang",khachHangRoutes)
router.use("/users", user);
module.exports = router;
