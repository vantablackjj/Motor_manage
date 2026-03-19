// routes/product.routes.js
const express = require("express");
const router = express.Router();
const ProductController = require("../controllers/product.controller");

const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/roleCheck");

router.use(authenticate);

router.get("/", checkPermission("products", "view"), ProductController.getAll);
router.get("/:id", checkPermission("products", "view"), ProductController.getById);
router.post("/", checkPermission("products", "create"), ProductController.create);
router.put("/:id", checkPermission("products", "edit"), ProductController.update);
router.delete("/:id", checkPermission("products", "delete"), ProductController.delete);
router.get("/:id/stock", checkPermission("products", "view"), ProductController.getStock);
router.get("/filters/:field", checkPermission("products", "view"), ProductController.getFilters);

module.exports = router;
