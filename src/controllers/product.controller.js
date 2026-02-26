// controllers/product.controller.js
const ProductCatalogService = require("../services/productCatalog.service");

class ProductController {
  /**
   * Get all products with filters
   */
  static async getAll(req, res) {
    try {
      const { type, brand, loai_hinh, noi_sx, status, limit, offset } =
        req.query;

      const filters = {
        // Only pass to loai_quan_ly if it's a valid enum value (SERIAL or BATCH)
        loai_quan_ly: ["SERIAL", "BATCH"].includes(type?.toUpperCase())
          ? type.toUpperCase()
          : undefined,
        // If type is XE or PT, treat it as a brand (group) filter if brand is not provided
        ma_nh:
          brand ||
          (["XE", "PT"].includes(type?.toUpperCase())
            ? type.toUpperCase()
            : undefined),
        loai_hinh: loai_hinh,
        noi_sx: noi_sx,
        status: status !== undefined ? status === "true" : true,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
      };

      const products = await ProductCatalogService.getAll(filters);
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get product by ID (ma_hang_hoa)
   */
  static async getById(req, res) {
    try {
      const product = await ProductCatalogService.getById(req.params.id);
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Hàng hóa không tồn tại" });
      }
      res.json({ success: true, data: product });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Create new product
   */
  static async create(req, res) {
    try {
      const product = await ProductCatalogService.create(req.body);
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Update product
   */
  static async update(req, res) {
    try {
      const product = await ProductCatalogService.update(
        req.params.id,
        req.body,
      );
      res.json({ success: true, data: product });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Delete product
   */
  static async delete(req, res) {
    try {
      await ProductCatalogService.delete(req.params.id);
      res.json({ success: true, message: "Xóa hàng hóa thành công" });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Get stock overview across warehouses
   */
  static async getStock(req, res) {
    try {
      const stock = await ProductCatalogService.getStockOverview(req.params.id);
      res.json({ success: true, data: stock });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get distinct values for filters
   */
  static async getFilters(req, res) {
    try {
      const { field } = req.params;
      const values = await ProductCatalogService.getDistinctValues(field);
      res.json({ success: true, data: values });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = ProductController;
