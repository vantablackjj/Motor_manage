module.exports = {
  // User roles
  ROLES: {
    ADMIN: "ADMIN",
    QUAN_LY_CTY: "QUAN_LY_CTY",
    QUAN_LY_CHI_NHANH: "QUAN_LY_CHI_NHANH",
    NHAN_VIEN: "NHAN_VIEN",
    KHO: "KHO",
    QUAN_LY: "QUAN_LY_CTY", // Fallback for old code
  },

  // Transaction status
  TRANG_THAI: {
    NHAP: "NHAP",
    GUI_DUYET: "GUI_DUYET",
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

  // Transaction types
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
};
