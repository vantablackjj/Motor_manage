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

  // Gắn danh sách kho đã được chuẩn hóa để Controller có thể tái sử dụng
  req.user.authorized_warehouses = assignedWarehouses;
  
  const hasAssignedWarehouses = assignedWarehouses.length > 0;

  // 2. Chế độ "Toàn quyền": CHỈ DÀNH CHO ADMIN hoặc các danh mục metadata (chỉ cho GET)
  // Cho phép mọi User xem danh mục Kho, Thương hiệu... để có thể chọn trong dropdown (vd: chọn kho nhận khi chuyển kho)
  const metadataPaths = ["/api/kho", "/api/brand", "/api/color", "/api/model-car", "/api/nhom-hang", "/api/loai-hinh"];
  const isMetadataPath = metadataPaths.some(p => req.originalUrl.startsWith(p));
  
  const hasFullAccess = user.vai_tro === ROLES.ADMIN || (req.method === "GET" && isMetadataPath);

  if (hasFullAccess) {
    if (req.query.ignore_isolation) delete req.query.ignore_isolation;
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
  // Tách thành 2 nhóm: Nguồn (cần kiểm soát chặt) và Đích (có thể linh hoạt hơn khi viết)
  const sourceFields = [
    "ma_kho", "kho_id", "ma_kho_hien_tai", "ma_kho_xuat",
    "tu_ma_kho", "ma_ben_xuat", "fromKho", "ma_kho_co", "kho_xuat", "kho_no"
  ];
  const destinationFields = [
    "ma_kho_nhap", "den_ma_kho", "ma_ben_nhap", "toKho", "ma_kho_no", "kho_nhap",
    "ma_kho_tra", "ma_kho_nhan", "kho_no", "kho_co"
  ];
  const warehouseFields = [...sourceFields, ...destinationFields];

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
          obj[field] = req.method === "GET" ? allowedRequested : allowedRequested[0];
        } else {
          // Nếu không kho nào yêu cầu là hợp lệ:
          if (req.method === "GET") {
             // Đối với GET: Ép về toàn bộ kho được gán để cách ly dữ liệu
             obj[field] = assignedWarehouses;
          } else {
             // Đối với POST/PUT/PATCH: 
             // Chế độ ghi dữ liệu: TRẢ VỀ LỖI 403 thay vì âm thầm sửa đổi hoặc bỏ qua
             // Điều này đảm bảo tính nhất quán giữa các nghiệp vụ (Nhập, Xuất, Chuyển kho)
             // và giúp người dùng nhận ra lỗi ngay lập tức khi chọn sai kho.
             const error = new Error(`Bạn không có quyền thực hiện thao tác tại kho này (${val}).`);
             error.status = 403;
             throw error;
          }
        }
      } else if (
        ["ma_kho", "ma_kho_hien_tai", "ma_kho_nhap", "ma_kho_xuat", "kho_xuat", "kho_nhap"].includes(field)
      ) {
        // Trường hợp người dùng KHÔNG truyền tham số kho cụ thể
        if (req.method === "GET") {
          // Đối với xem danh sách: Luôn đảm bảo có filter ma_kho theo phân quyền
          if (field === "ma_kho") {
             obj[field] = assignedWarehouses;
          }
        } else if (["ma_kho", "ma_kho_nhap", "ma_kho_xuat"].includes(field)) {
          // Đối với hành động ghi dữ liệu: Tự động gán kho mặc định nếu thiếu trường quan trọng
          obj[field] = defaultWarehouse;
        }
      }
    });
  };

  try {
    // Áp dụng cho tham số Query (thường dùng cho GET)
    if (req.query) normalizeAndIsolate(req.query);
    
    // Áp dụng cho Body (thường dùng cho POST/PUT/PATCH)
    if (req.body) {
      normalizeAndIsolate(req.body);
      if (req.body.params && typeof req.body.params === "object") {
        normalizeAndIsolate(req.body.params);
      }
    }
  } catch (err) {
    if (err.status === 403) {
      return sendError(res, err.message, 403);
    }
    return next(err);
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
