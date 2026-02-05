// routes/order.routes.js
const express = require("express");
const router = express.Router();
const OrderController = require("../controllers/order.controller");

router.get("/", OrderController.getList);
router.get("/:id", OrderController.getDetail);
router.get("/:id/details", OrderController.getDetail);
router.post("/:id/details", OrderController.addItem);
router.delete("/:id/details/:stt", OrderController.removeItem);
router.post("/", OrderController.create);
router.put("/:id", OrderController.update);
router.patch("/:id/status", OrderController.updateStatus);
router.post("/:id/deliver", OrderController.deliver);

module.exports = router;
