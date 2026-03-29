const OrderService = require("../services/order.service");
const ActivityLogger = require("../utils/activityLogger");

class OrderController {
  /**
   * Create a new order (PO, SO, TO)
   */
  static async create(req, res) {
    try {
      const orderData = {
        ...req.body,
        nguoi_tao: req.user
          ? req.user.username || req.user.ho_ten || String(req.user.id)
          : null,
        created_by: req.user ? req.user.id : null,
      };
      const order = await OrderService.createOrder(orderData);
      await ActivityLogger.record(req, "CREATE", "orders", order.so_phieu, {
        orderData,
      });
      res.status(201).json({ success: true, data: order });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Process delivery / Create Invoice from Order
   */
  static async deliver(req, res) {
    try {
      const { id } = req.params;
      const deliveryData = {
        ...req.body,
        nguoi_lap: req.user
          ? req.user.username || req.user.ho_ten || String(req.user.id)
          : null,
        created_by: req.user ? req.user.id : null,
      };
      const result = await OrderService.createInvoiceFromOrder(
        id,
        deliveryData,
      );
      await ActivityLogger.record(req, "DELIVER", "orders", id, {
        deliveryData,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Get list of orders
   */
  static async getList(req, res) {
    try {
      const result = await OrderService.getOrders(req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Get order detail
   */
  static async getDetail(req, res) {
    try {
      const { id } = req.params;
      const order = await OrderService.getOrderById(id);
      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Đơn hàng không tồn tại" });
      }

      // Warehouse isolation check
      const { ROLES } = require("../config/constants");
      const isGlobalAdmin = req.user.vai_tro === ROLES.ADMIN;
      
      if (!isGlobalAdmin) {
        const authorized = req.user.authorized_warehouses || [];
        const ma_kho_xuat = order.ma_ben_xuat;
        const ma_kho_nhap = order.ma_ben_nhap;

        const isRelated = (order.loai_ben_xuat === "KHO" && authorized.includes(ma_kho_xuat)) ||
                          (order.loai_ben_nhap === "KHO" && authorized.includes(ma_kho_nhap));

        if (!isRelated) {
          return res.status(403).json({
            success: false,
            message: "Bạn không có quyền xem đơn hàng của kho này",
          });
        }
      }

      res.json({ success: true, data: order });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Update Order Header (Discount, VAT, Note)
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const order = await OrderService.updateOrder(id, req.body);
      res.json({ success: true, data: order });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Update Order Status (Approve, Cancel)
   */
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = req.user;
      const userId = user ? user.id : null;

      // 1. Get current order state to verify roles against transition
      const order = await OrderService.getOrderById(id);
      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Đơn hàng không tồn tại" });
      }

      const currentStatus = order.trang_thai;
      const authorities = user.authorities || [];
      const { ROLES } = require("../config/constants");

      const hasApprovalPower =
        user.vai_tro === ROLES.ADMIN ||
        user.vai_tro === ROLES.QUAN_LY ||
        authorities.includes("sales_orders.approve") ||
        authorities.includes("purchase_orders.approve") ||
        authorities.includes("don_hang_ban_xe.approve") ||
        authorities.includes("don_hang_mua_xe.approve");

      // Permission Rules:
      // A. Management Actions: Only managers can APPROVE, REJECT, or RETURN from a non-Draft state
      const restrictedStatuses = ["DA_DUYET", "TU_CHOI"];
      if (currentStatus !== "NHAP" && status === "NHAP") {
        restrictedStatuses.push("NHAP");
      }

      if (restrictedStatuses.includes(status) && !hasApprovalPower) {
        let message =
          "Thao tác này chỉ dành cho quản lý. Bạn không có quyền thực hiện.";
        if (status === "NHAP")
          message = "Bạn không thể trả về phiếu sau khi đã gửi duyệt.";
        if (status === "DA_DUYET") message = "Bạn không có quyền phê duyệt phiếu.";
        if (status === "TU_CHOI") message = "Bạn không có quyền từ chối phiếu.";

        return res.status(403).json({
          success: false,
          message,
        });
      }

      // B. Cancellation Rule: Sale can only cancel their own DRAFT (NHAP) orders
      if (
        status === "DA_HUY" &&
        currentStatus !== "NHAP" &&
        !hasApprovalPower
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Không thể hủy đơn hàng đã gửi duyệt hoặc đã được phê duyệt. Vui lòng liên hệ quản lý.",
        });
      }

      // C. Safe passage for GUI_DUYET (Submit for approval) - allowed if user can access this route

      const result = await OrderService.updateStatus(id, status, userId);

      await ActivityLogger.record(req, "UPDATE_STATUS", "orders", id, {
        from: currentStatus,
        to: status,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Add item to existing order (POST /:id/details)
   */
  static async addItem(req, res) {
    try {
      const { id } = req.params;
      const result = await OrderService.addItemToOrder(id, req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Remove item from existing order (DELETE /:id/details/:stt)
   */
  static async removeItem(req, res) {
    try {
      const { id, stt } = req.params;
      const result = await OrderService.removeItemFromOrder(id, stt);
      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = OrderController;
