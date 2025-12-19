// controllers/vehicleController.js
const vehicleService = require('../services/themXe.service');

class VehicleController {
  /**
   * POST /api/vehicles/nhap-moi
   * Nhập xe mới vào kho
   */
  async nhapXeMoi(req, res) {
    try {
      const userId = req.user.username; // Từ middleware authentication
      const data = req.body;

      const result = await vehicleService.nhapXeMoi(data, userId);

      res.status(201).json(result);
    } catch (error) {
      console.error('Error nhap xe moi:', error);
      
      if (error.status) {
        return res.status(error.status).json({
          success: false,
          message: error.message,
          errors: error.errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi nhập xe',
        error: error.message
      });
    }
  }

  /**
   * POST /api/vehicles/nhap-tu-don-hang
   * Nhập xe từ đơn hàng đã đặt
   */
   async nhapXeTuDonHang(req, res) {
    try {
      const userId = req.user.username;
      const { ma_phieu, ct_id } = req.params;
      const data = req.body; // so_khung, so_may, gia_nhap, ngay_nhap, ma_mau

      const result = await vehicleService.nhapXeTuDonHang(
        ma_phieu,
        parseInt(ct_id, 10),
        data,
        userId
      );

      return res.status(201).json(result);

    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          success: false,
          message: error.message,
          errors: error.errors || []
        });
      }

      console.error(error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi nhập xe từ đơn hàng'
      });
    }
  }


  /**
   * GET /api/vehicles/kho/:maKho
   * Lấy danh sách xe trong kho
   */
  async getXeInKho(req, res) {
    try {
      const { maKho } = req.params;
      const filters = {
        trang_thai: req.query.trang_thai,
        ma_loai_xe: req.query.ma_loai_xe,
        search: req.query.search,
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
      };

      const vehicles = await vehicleService.getXeInKho(maKho, filters);

      res.json({
        success: true,
        data: vehicles,
        total: vehicles.length
      });
    } catch (error) {
      console.error('Error get xe in kho:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách xe',
        error: error.message
      });
    }
  }

  /**
   * GET /api/vehicles/:xeKey
   * Lấy thông tin chi tiết xe
   */
  async getXeDetail(req, res) {
    try {
      const { xeKey } = req.params;
      
      const result = await vehicleService.getXeDetail(xeKey);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy xe'
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error get xe detail:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy thông tin xe',
        error: error.message
      });
    }
  }

  /**
   * POST /api/vehicles/check-duplicate
   * Kiểm tra trùng số khung, số máy
   */
  async checkDuplicate(req, res) {
    try {
      const { so_khung, so_may, exclude_id } = req.body;

      if (!so_khung || !so_may) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin số khung hoặc số máy'
        });
      }

      const errors = await vehicleService.checkDuplicate(
        so_khung, 
        so_may, 
        exclude_id
      );

      res.json({
        success: true,
        is_duplicate: errors.length > 0,
        errors: errors
      });
    } catch (error) {
      console.error('Error check duplicate:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi kiểm tra trùng lặp',
        error: error.message
      });
    }
  }

  /**
   * GET /api/vehicles/:xeKey/history
   * Lấy lịch sử giao dịch của xe
   */
  async getXeHistory(req, res) {
    try {
      const { xeKey } = req.params;
      
      const history = await vehicleService.getXeHistory(xeKey);

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Error get xe history:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy lịch sử xe',
        error: error.message
      });
    }
  }
}

module.exports = new VehicleController();