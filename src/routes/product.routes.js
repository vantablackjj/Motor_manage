// routes/product.routes.js
const express = require("express");
const router = express.Router();
const ProductController = require("../controllers/product.controller");

router.get("/", ProductController.getAll);
router.get("/:id", ProductController.getById);
router.post("/", ProductController.create);
router.put("/:id", ProductController.update);
router.delete("/:id", ProductController.delete);
router.get("/:id/stock", ProductController.getStock);
router.get("/filters/:field", ProductController.getFilters);

module.exports = router;
