
const donHangMuaService = require('../services/donHangMua.service');
const { sendSuccess, sendError } = require('../ultils/respone');
const logger = require('../ultils/logger');

class DonHangMuaController {
  // GET /api/v1/don-hang-mua
  async getDanhSach(req, res, next) {
    try {
      const filters = {
        trang_thai: req.query.trang_thai,
        ma_kho_nhap: req.query.ma_kho_nhap,
        tu_ngay: req.query.tu_ngay,
        den_ngay: req.query.den_ngay
      };
      
      const data = await donHangMuaService.getDanhSach(filters);
      sendSuccess(res, data, 'Lấy danh sách đơn hàng mua thành công');
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/don-hang-mua/:ma_phieu
  async getChiTiet(req, res, next) {
    try {
      const { ma_phieu } = req.params;
      const data = await donHangMuaService.getChiTiet(ma_phieu);
      
      if (!data) {
        return sendError(res, 'Đơn hàng không tồn tại', 404);
      }
      
      sendSuccess(res, data, 'Lấy chi tiết đơn hàng thành công');
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/don-hang-mua
  async taoDonHang(req, res, next) {
    try {
      const data = {
        ...req.body,
        nguoi_tao: req.user.username
      };
      
      const result = await donHangMuaService.taoDonHang(data);
      
      logger.info(`Đơn hàng ${result.ma_phieu} được tạo bởi ${req.user.username}`);
      
      sendSuccess(res, result, 'Tạo đơn hàng mua thành công', 201);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/don-hang-mua/:ma_phieu/chi-tiet
  async themPhuTung(req, res, next) {
    try {
      const { ma_phieu } = req.params;
      const chi_tiet = req.body;
      
      const result = await donHangMuaService.themPhuTung(ma_phieu, chi_tiet);
      
      sendSuccess(res, result, 'Thêm phụ tùng vào đơn hàng thành công');
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/don-hang-mua/:ma_phieu/gui-duyet
  async guiDuyet(req, res, next) {
    try {
      const { ma_phieu } = req.params;
      const result = await donHangMuaService.guiDuyet(ma_phieu, req.user.username);
      
      logger.info(`Đơn hàng ${ma_phieu} được gửi duyệt bởi ${req.user.username}`);
      
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/don-hang-mua/:ma_phieu/phe-duyet
  async pheDuyet(req, res, next) {
    try {
      const { ma_phieu } = req.params;
      const result = await donHangMuaService.pheDuyet(ma_phieu, req.user.username);
      
      logger.info(`Đơn hàng ${ma_phieu} được duyệt bởi ${req.user.username}`);
      
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
  
async huyDuyet(req,res,next){
  try {
    const { ma_phieu } = req.params;
    const username = req.user.username;
    const { ly_do } = req.body;
    
    const data = await donHangMuaService.tuChoiDonHang(ma_phieu, username, ly_do);
    
    sendSuccess(res, data, 'Đơn mua xe đã bị từ chối');
  } catch (err) {
    next(err);
  }
}
}


module.exports = new DonHangMuaController();