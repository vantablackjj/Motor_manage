// controllers/order.controller.js
const OrderService = require("../services/order.service");

class OrderController {
  /**
   * Create a new order (PO, SO, TO)
   */
  static async create(req, res) {
    try {
      const orderData = {
        ...req.body,
        nguoi_tao: req.user ? req.user.id : null,
      };
      const order = await OrderService.createOrder(orderData);
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
        nguoi_lap: req.user ? req.user.id : null,
      };
      const result = await OrderService.createInvoiceFromOrder(
        id,
        deliveryData,
      );
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
      const userId = req.user ? req.user.id : null;
      const order = await OrderService.updateStatus(id, status, userId);
      res.json({ success: true, data: order });
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
