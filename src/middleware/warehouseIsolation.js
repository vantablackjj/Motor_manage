const { ROLES } = require("../config/constants");
const { sendError } = require("../ultils/respone");

/**
 * Middleware thực hiện cách ly dữ liệu theo kho
 * Đối với nhân viên (BAN_HANG, KHO), hệ thống sẽ tự động gán mã kho của họ vào filter
 * Nếu là Quản lý, Kế toán hoặc Admin, họ có quyền xem dữ liệu toàn hệ thống
 */
const warehouseIsolation = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return sendError(res, "Unauthorized", 401);
  }

  // Admin, Quản lý và Kế toán có quyền xem toàn bộ kho
  const hasFullAccess = [ROLES.ADMIN, ROLES.QUAN_LY, ROLES.KE_TOAN].includes(
    user.vai_tro,
  );

  if (hasFullAccess) {
    return next();
  }

  // Đối với Nhân viên (BAN_HANG, KHO), buộc phải lọc theo kho của họ
  if ([ROLES.BAN_HANG, ROLES.KHO].includes(user.vai_tro)) {
    if (!user.ma_kho) {
      // Nếu nhân viên chưa được gán kho, họ không có quyền xem dữ liệu kho
      return sendError(
        res,
        "Bạn chưa được gán vào kho nào. Vui lòng liên hệ Admin.",
        403,
      );
    }

    // Nếu người dùng cố tình truyền mã kho khác, ta ghi đè bằng mã kho của họ
    if (req.query) {
      req.query.ma_kho = user.ma_kho;
    }

    if (req.body && (req.body.ma_kho || req.method === "POST")) {
      // Đối với các thao tác tạo/sửa, cũng ép mã kho
      req.body.ma_kho = user.ma_kho;
    }
  }

  next();
};

module.exports = { warehouseIsolation };
