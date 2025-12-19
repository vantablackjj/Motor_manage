// controllers/donHangMuaXe.controller.js - ĐÃ SỬA LỖI
const DonHangMuaXeService = require('../services/donHangMuaXe.service');
const { sendSuccess } = require('../ultils/respone');

class DonHangMuaXeController {

  /**
   * ✅ 1. Lấy danh sách đơn hàng - THÊM MỚI
   */
  async getList(req, res, next) {
    try {
      const filters = {
        trang_thai: req.query.trang_thai,
        ma_kho_nhap: req.query.ma_kho_nhap,
        tu_ngay: req.query.tu_ngay,
        den_ngay: req.query.den_ngay,
        limit: req.query.limit,
        offset: req.query.offset
      };

      const data = await DonHangMuaXeService.getList(filters);
      
      sendSuccess(res, data, 'Lấy danh sách đơn hàng thành công');
    } catch (err) {
      next(err);
    }
  }

  /**
   * ✅ 2. Tạo đơn mua - ĐÃ SỬA (dùng username)
   */
  async create(req, res, next) {
    try {
      const username = req.user.username; // ✅ Dùng username thay vì id
      const data = await DonHangMuaXeService.createDonHang(req.body, username);
      
      sendSuccess(res, data, 'Tạo đơn mua xe thành công', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * ✅ 3. Xem chi tiết đơn - GIỮ NGUYÊN
   */
  async detail(req, res, next) {
    try {
      const { ma_phieu } = req.params;
      const data = await DonHangMuaXeService.getDetail(ma_phieu);
      
      sendSuccess(res, data, 'Lấy chi tiết đơn mua xe thành công');
    } catch (err) {
      next(err);
    }
  }

  /**
   * ✅ 4. Thêm chi tiết đơn - GIỮ NGUYÊN
   */
  async addChiTiet(req, res, next) {
    try {
      const { ma_phieu } = req.params;
      const data = await DonHangMuaXeService.addChiTiet(ma_phieu, req.body);
      
      sendSuccess(res, data, 'Thêm chi tiết đơn hàng thành công', 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * ✅ 5. Xóa chi tiết đơn - THÊM MỚI
   */
  async deleteChiTiet(req, res, next) {
    try {
      const { ma_phieu, id } = req.params;
      const data = await DonHangMuaXeService.deleteChiTiet(ma_phieu, parseInt(id));
      
      sendSuccess(res, data, 'Xóa chi tiết đơn hàng thành công');
    } catch (err) {
      next(err);
    }
  }

  /**
   * ✅ 6. Gửi duyệt - ĐÃ SỬA (dùng username)
   */
  async submit(req, res, next) {
    try {
      const { ma_phieu } = req.params;
      const username = req.user.username; // ✅ Dùng username
      
      const data = await DonHangMuaXeService.submitDonHang(ma_phieu, username);
      
      sendSuccess(res, data, 'Đã gửi đơn mua xe để duyệt');
    } catch (err) {
      next(err);
    }
  }

  /**
   * ✅ 7. Duyệt đơn - ĐÃ SỬA (dùng username)
   */
  async approve(req, res, next) {
    try {
      const { ma_phieu } = req.params;
      const username = req.user.username; // ✅ Dùng username
      
      const data = await DonHangMuaXeService.duyetDonHang(ma_phieu, username);
      
      sendSuccess(res, data, 'Đơn mua xe đã được duyệt');
    } catch (err) {
      next(err);
    }
  }

  /**
   * ✅ 8. Từ chối đơn - THÊM MỚI
   */
  async reject(req, res, next) {
    try {
      const { ma_phieu } = req.params;
      const username = req.user.username;
      const { ly_do } = req.body;
      
      const data = await DonHangMuaXeService.tuChoiDonHang(ma_phieu, username, ly_do);
      
      sendSuccess(res, data, 'Đơn mua xe đã bị từ chối');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DonHangMuaXeController();