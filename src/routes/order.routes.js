// routes/order.routes.js
const express = require("express");
const router = express.Router();
const OrderController = require("../controllers/order.controller");

const { authenticate } = require("../middleware/auth");
const { checkPermission, checkAnyPermission } = require("../middleware/roleCheck");
const { warehouseIsolation } = require("../middleware/warehouseIsolation");

router.use(authenticate, warehouseIsolation);

router.get("/", checkPermission("sales_orders", "view"), OrderController.getList);
router.get("/:id", checkPermission("sales_orders", "view"), OrderController.getDetail);
router.get("/:id/details", checkPermission("sales_orders", "view"), OrderController.getDetail);
router.post("/:id/details", checkPermission("sales_orders", "edit"), OrderController.addItem);
router.delete("/:id/details/:stt", checkPermission("sales_orders", "edit"), OrderController.removeItem);
router.post("/", checkPermission("sales_orders", "create"), OrderController.create);
router.put("/:id", checkPermission("sales_orders", "edit"), OrderController.update);
router.patch("/:id/status", checkAnyPermission("sales_orders.view", "sales_orders.edit", "sales_orders.approve"), OrderController.updateStatus);
router.post("/:id/deliver", checkPermission("sales_orders", "edit"), OrderController.deliver);

module.exports = router;
