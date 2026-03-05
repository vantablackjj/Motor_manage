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

  // Admin và Quản lý có quyền xem toàn bộ kho
  const hasFullAccess = [
    ROLES.ADMIN,
    ROLES.QUAN_LY,
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

    const singularFields = ["ma_kho", "kho_id", "ma_kho_hien_tai"];
    const pairFields = [
      ["ma_kho_xuat", "ma_kho_nhap"],
      ["ma_ben_xuat", "ma_ben_nhap"],
      ["tu_ma_kho", "den_ma_kho"],
      ["fromKho", "toKho"],
    ];

    const forceWarehouse = (obj) => {
      if (!obj || typeof obj !== "object") return;

      // 1. Handle singular fields
      singularFields.forEach((field) => {
        if (obj[field]) obj[field] = user.ma_kho;
      });

      // 2. Handle pair fields (Source/Destination)
      // For transfers, we allow xuat/nhap to be different, but at least one MUST be the user's warehouse
      pairFields.forEach(([xuat, nhap]) => {
        const hasXuat = !!obj[xuat];
        const hasNhap = !!obj[nhap];

        if (hasXuat && hasNhap) {
          // If both are provided, at least one must belong to the user
          if (obj[xuat] !== user.ma_kho && obj[nhap] !== user.ma_kho) {
            // If neither matches, force the 'near' side based on context or default to source
            // For security, if they are restricted, they can only initiate from their warehouse
            obj[xuat] = user.ma_kho;
          }
        } else if (hasXuat) {
          obj[xuat] = user.ma_kho;
        } else if (hasNhap) {
          obj[nhap] = user.ma_kho;
        }
      });

      // 3. Always set primary ma_kho to be sure for other filters
      obj.ma_kho = user.ma_kho;

      // Handle nested params object
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

    // 4. Force specific fields based on Route
    if (req.method === "POST" || req.method === "PUT") {
      const url = req.originalUrl;
      if (url.includes("don-hang-mua")) req.body.ma_kho_nhap = user.ma_kho;
      if (url.includes("hoa-don-ban")) req.body.ma_kho_xuat = user.ma_kho;

      // For chuyen-kho, if it's a restricted user, we must ensure at least one side is theirs
      if (url.includes("chuyen-kho")) {
        if (
          req.body.ma_kho_xuat !== user.ma_kho &&
          req.body.ma_kho_nhap !== user.ma_kho
        ) {
          // If neither side is the user's warehouse, default the source to their warehouse
          req.body.ma_kho_xuat = user.ma_kho;
        }
      }
    }
  }

  next();
};

module.exports = { warehouseIsolation };
