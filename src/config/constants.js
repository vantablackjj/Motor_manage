module.exports = {
  // User roles - Hệ thống 5 role theo yêu cầu mentor
  ROLES: {
    ADMIN: "ADMIN", // Quản trị viên - Toàn quyền
    BAN_HANG: "BAN_HANG", // Nhân viên bán hàng
    KHO: "KHO", // Nhân viên kho
    KY_THUAT: "KY_THUAT", // Kỹ thuật viên
    KE_TOAN: "KE_TOAN", // Kế toán
    QUAN_LY: "QUAN_LY", // Quản lý

    // Legacy support (deprecated)
    QUAN_LY_CTY: "QUAN_LY", // Fallback to QUAN_LY
    QUAN_LY_CHI_NHANH: "QUAN_LY", // Fallback to QUAN_LY
    NHAN_VIEN: "BAN_HANG", // Fallback to BAN_HANG
  },

  // Transaction status
  TRANG_THAI: {
    NHAP: "NHAP",
    GUI_DUYET: "GUI_DUYET",
    CHO_DUYET: "CHO_DUYET",
    DA_DUYET: "DA_DUYET",
    TU_CHOI: "TU_CHOI",
    DA_HUY: "DA_HUY",
  },

  // Vehicle status
  XE_TRANG_THAI: {
    CHO_NHAP_KHO: "CHO_NHAP_KHO",
    TON_KHO: "TON_KHO",
    DANG_CHUYEN: "DANG_CHUYEN",
    DA_BAN: "DA_BAN",
    BAO_HANH: "BAO_HANH",
    HU_HONG: "HU_HONG",
  },

  // Order types (for tm_don_hang table - enum_loai_don_hang)
  // Use these for filtering/creating orders
  LOAI_DON_HANG: {
    MUA_HANG: "MUA_HANG", // Purchase Order
    BAN_HANG: "BAN_HANG", // Sales Order
    CHUYEN_KHO: "CHUYEN_KHO", // Transfer Order
  },

  // Warehouse transaction types (for tm_phieu_kho table - enum_loai_phieu_kho)
  // These are NOT order types - they represent warehouse movements
  LOAI_GIAO_DICH: {
    NHAP_KHO: "NHAP_KHO",
    XUAT_KHO: "XUAT_KHO",
    CHUYEN_KHO: "CHUYEN_KHO",
    BAN_HANG: "BAN_HANG",
    TRA_HANG: "TRA_HANG",
    KIEM_KE: "KIEM_KE",
    CAP_NHAT: "CAP_NHAT",
  },

  // Payment types
  LOAI_TIEN: {
    TIEN_MAT: "TIEN_MAT",
    CHUYEN_KHOAN: "CHUYEN_KHOAN",
    THE: "THE",
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },

  // Full Admin Permissions (Fallback for UI)
  FULL_ADMIN_PERMISSIONS: {
    users: { view: true, create: true, edit: true, delete: true },
    roles: { view: true, create: true, edit: true, delete: true },
    warehouses: { view: true, create: true, edit: true, delete: true },
    products: { view: true, create: true, edit: true, delete: true, view_cost: true },
    partners: { view: true, create: true, edit: true, delete: true },
    purchase_orders: { view: true, create: true, edit: true, delete: true, approve: true },
    sales_orders: { view: true, create: true, edit: true, delete: true, approve: true },
    invoices: { view: true, create: true, edit: true, delete: true },
    inventory: { view: true, import: true, export: true, transfer: true, adjust: true },
    debt: { view: true, create: true, edit: true, delete: true },
    payments: { view: true, create: true, edit: true, delete: true, approve: true },
    reports: { view: true, export: true, view_financial: true },
    settings: { view: true, edit: true },
  },
};
