const { ROLES } = require("../config/constants");
const { sendError } = require("../utils/response");

/**
 * Middleware thực hiện cách ly dữ liệu theo kho
 * Đảm bảo người dùng chỉ có thể truy cập dữ liệu thuộc các kho họ được phân quyền.
 */
const warehouseIsolation = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return sendError(res, "Unauthorized", 401);
  }

  // 1. Xác định danh sách các kho người dùng được phép truy cập
  const assignedWarehouses = (user.allowed_warehouses || [])
    .map(k => (typeof k === "string" ? k.trim() : k?.ma_kho?.trim()))
    .filter(Boolean);
  
  if (user.ma_kho) {
    const trimmedHome = user.ma_kho.trim();
    if (!assignedWarehouses.includes(trimmedHome)) {
      assignedWarehouses.push(trimmedHome);
    }
  }
  
  const hasAssignedWarehouses = assignedWarehouses.length > 0;

  // 2. Chế độ "Toàn quyền": CHỈ DÀNH CHO ADMIN
  const hasFullAccess = user.vai_tro === ROLES.ADMIN;

  if (hasFullAccess) {
    return next();
  }

  // 3. Kiểm tra tính hợp lệ của phân quyền
  if (!hasAssignedWarehouses) {
    const restrictedRoles = [ROLES.BAN_HANG, ROLES.KHO, ROLES.KY_THUAT, ROLES.QUAN_LY, ROLES.KE_TOAN];
    if (restrictedRoles.includes(user.vai_tro)) {
      return sendError(
        res,
        "Bạn chưa được gán vào kho nào. Vui lòng liên hệ Admin để được cấp quyền theo kho.",
        403,
      );
    }
    return next(); 
  }

  const defaultWarehouse = assignedWarehouses[0];
  
  // Danh sách các trường có thể chứa mã kho cần bảo vệ
  const warehouseFields = [
    "ma_kho", "kho_id", "ma_kho_hien_tai", "ma_kho_nhap", "ma_kho_xuat",
    "tu_ma_kho", "den_ma_kho", "ma_ben_nhap", "ma_ben_xuat",
    "fromKho", "toKho", "ma_kho_no", "ma_kho_co", "kho_xuat", "kho_nhap",
    "ma_kho_tra", "ma_kho_nhan", "kho_no", "kho_co"
  ];

  /**
   * Hàm chuẩn hóa và cô lập dữ liệu
   */
  const normalizeAndIsolate = (obj) => {
    if (!obj || typeof obj !== "object") return;

    // A. Kiểm tra xem người dùng có truyền bất kỳ tham số kho nào không
    let providedWarehouseField = null;
    for (const field of warehouseFields) {
      if (obj[field] !== undefined && obj[field] !== null && obj[field] !== "") {
        providedWarehouseField = field;
        break;
      }
    }

    // B. Xử lý từng trường kho
    warehouseFields.forEach((field) => {
      const val = obj[field];
      
      if (val !== undefined && val !== null && val !== "") {
        // Trường hợp người dùng CÓ truyền tham số kho -> Kiểm tra tính hợp lệ
        // Hỗ trợ cả string ("K1"), comma-string ("K1,K2") và array (["K1", "K2"])
        const requested = (Array.isArray(val) ? val : String(val).split(","))
          .map((v) => v.toString().trim())
          .filter(Boolean);
        
        // Chỉ giữ lại những kho nằm trong danh sách được phép
        const allowedRequested = requested.filter((v) => assignedWarehouses.includes(v));

        if (allowedRequested.length > 0) {
          // Trả về danh sách kho hợp lệ. 
          // Đối với GET (xem danh sách/báo cáo): Trả về mảng để Service dùng ANY()
          // Đối với POST/PUT/PATCH (tạo/sửa): Chỉ lấy kho đầu tiên hợp lệ để tránh sai sót
          obj[field] = req.method === "GET" ? allowedRequested : allowedRequested[0];
        } else {
          // Nếu không kho nào yêu cầu là hợp lệ -> Ép về kho mặc định hoặc toàn bộ kho được gán
          obj[field] = req.method === "GET" ? assignedWarehouses : defaultWarehouse;
        }
      } else if (
        ["ma_kho", "ma_kho_hien_tai", "ma_kho_nhap", "ma_kho_xuat", "kho_xuat", "kho_nhap"].includes(field)
      ) {
        // Trường hợp người dùng KHÔNG truyền tham số kho cụ thể
        if (req.method === "GET") {
          // Đối với xem danh sách: Nếu không có bất kỳ bộ lọc kho nào khác, tự động điền toàn bộ kho được gán
          // Chỉ điền vào ma_kho để tránh làm sai lệch các bộ lọc đối tác (như ma_ben_nhap trong hóa đơn bán)
          if (!providedWarehouseField && field === "ma_kho") {
             obj[field] = assignedWarehouses;
          }
        } else if (["ma_kho", "ma_kho_nhap", "ma_kho_xuat"].includes(field)) {
          // Đối với hành động ghi dữ liệu: Ép về kho mặc định nếu thiếu trường quan trọng
          obj[field] = defaultWarehouse;
        }
      }
    });
  };

  // Áp dụng cho tham số Query (thường dùng cho GET)
  if (req.query) normalizeAndIsolate(req.query);
  
  // Áp dụng cho Body (thường dùng cho POST/PUT/PATCH/EXCEL/PDF)
  if (req.body) {
    normalizeAndIsolate(req.body);
    // Xử lý báo cáo: Bộ lọc thường bọc trong body.params
    if (req.body.params && typeof req.body.params === "object") {
      normalizeAndIsolate(req.body.params);
    }
  }
  
  // Áp dụng cho Params (thường dùng cho các route dạng /:ma_kho)
  if (req.params) {
    // Với params, chúng ta không thể chuyển thành array vì route pattern là string
    // Nên chỉ lấy warehouse đầu tiên hợp lệ hoặc gán lại nếu không có quyền
    warehouseFields.forEach(field => {
      const val = req.params[field];
      if (val && !assignedWarehouses.includes(val.toString().trim())) {
        req.params[field] = defaultWarehouse;
      }
    });
  }

  next();
};

module.exports = { warehouseIsolation };
