const { ROLES } = require("../config/constants");
const { sendError } = require("../utils/response");

/**
 * Middleware thực hiện cách ly dữ liệu theo kho
 * Đối với nhân viên (BAN_HANG, KHO, NHAN_VIEN), hệ thống sẽ tự động gán mã kho của họ vào filter
 * Nếu là Quản lý, Kế toán hoặc Admin, họ có quyền xem dữ liệu toàn hệ thống
 */
const warehouseIsolation = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return sendError(res, "Unauthorized", 401);
  }

  // Admin, Quản lý và Kế toán có quyền xem toàn bộ kho
  const hasFullAccess = [
    ROLES.ADMIN,
    ROLES.QUAN_LY,
    ROLES.KE_TOAN,
    ROLES.QUAN_LY_CTY,
  ].includes(user.vai_tro);

  if (hasFullAccess) {
    return next();
  }

  // Đối với Nhân viên (BAN_HANG, KHO, NHAN_VIEN), buộc phải lọc theo kho của họ
  if ([ROLES.BAN_HANG, ROLES.KHO, ROLES.NHAN_VIEN].includes(user.vai_tro)) {
    if (!user.ma_kho) {
      return sendError(
        res,
        "Bạn chưa được gán vào kho nào. Vui lòng liên hệ Admin.",
        403,
      );
    }

    const warehouseFields = [
      "ma_kho",
      "ma_kho_nhap",
      "ma_kho_xuat",
      "kho_id",
      "ma_kho_hien_tai",
      "ma_ben_nhap",
      "ma_ben_xuat",
      "fromKho",
      "toKho",
      "tu_ma_kho",
      "den_ma_kho",
    ];

    const forceWarehouse = (obj) => {
      if (!obj || typeof obj !== "object") return;
      warehouseFields.forEach((field) => {
        if (obj[field]) obj[field] = user.ma_kho;
      });
      // Always inject primary ma_kho to be sure
      obj.ma_kho = user.ma_kho;

      // Handle nested params object (common in export/report routes)
      if (obj.params && typeof obj.params === "object") {
        forceWarehouse(obj.params);
      }
    };

    // 1. Xử lý Query String
    if (req.query) forceWarehouse(req.query);

    // 2. Xử lý Request Body
    if (req.body) forceWarehouse(req.body);

    // 3. Xử lý URL Params
    if (req.params) forceWarehouse(req.params);

    // Cưỡng ép thêm dựa trên URL cho chắc chắn
    if (req.method === "POST" || req.method === "PUT") {
      if (req.originalUrl.includes("don-hang-mua"))
        req.body.ma_kho_nhap = user.ma_kho;
      if (req.originalUrl.includes("hoa-don-ban"))
        req.body.ma_kho_xuat = user.ma_kho;
    }
  }

  next();
};

module.exports = { warehouseIsolation };
