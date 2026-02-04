/**
 * CreateDonHangUseCase
 * Business logic for creating orders (Purchase, Sales, Transfer)
 * Implements Clean Architecture Use Case pattern
 */

const UnitOfWork = require("../repositories/UnitOfWork");
const HangHoaRepository = require("../repositories/HangHoaRepository");
const DoiTacRepository = require("../repositories/DoiTacRepository");
const KhoRepository = require("../repositories/KhoRepository");
const TonKhoRepository = require("../repositories/TonKhoRepository");
const logger = require("../ultils/logger");

class CreateDonHangUseCase {
  /**
   * Execute use case
   * @param {Object} data - Order data
   * @returns {Object} Created order
   */
  async execute(data) {
    const {
      so_don_hang,
      loai_don_hang,
      ngay_dat_hang,
      ma_ben_xuat,
      loai_ben_xuat,
      ma_ben_nhap,
      loai_ben_nhap,
      chiet_khau = 0,
      vat_percentage = 0,
      chi_tiet = [],
      nguoi_tao,
      ghi_chu,
    } = data;

    // Validate input
    this._validateInput(data);

    const uow = new UnitOfWork();

    try {
      const result = await uow.execute(async (uow) => {
        // 1. Validate references
        await this._validateReferences(
          loai_ben_xuat,
          ma_ben_xuat,
          loai_ben_nhap,
          ma_ben_nhap,
          uow.client,
        );

        // 2. Validate products and calculate totals
        const validatedDetails = await this._validateAndCalculateDetails(
          chi_tiet,
          loai_don_hang,
          ma_ben_xuat,
          loai_ben_xuat,
          uow.client,
        );

        const tong_gia_tri = validatedDetails.reduce(
          (sum, item) => sum + item.thanh_tien,
          0,
        );
        const thanh_tien =
          tong_gia_tri - chiet_khau + (tong_gia_tri * vat_percentage) / 100;

        // 3. Create order header
        const orderResult = await uow.query(
          `INSERT INTO tm_don_hang (
                        so_don_hang, loai_don_hang, ngay_dat_hang,
                        ma_ben_xuat, loai_ben_xuat, ma_ben_nhap, loai_ben_nhap,
                        tong_gia_tri, chiet_khau, vat_percentage, thanh_tien,
                        trang_thai, nguoi_tao, ghi_chu
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    RETURNING *`,
          [
            so_don_hang,
            loai_don_hang,
            ngay_dat_hang,
            ma_ben_xuat,
            loai_ben_xuat,
            ma_ben_nhap,
            loai_ben_nhap,
            tong_gia_tri,
            chiet_khau,
            vat_percentage,
            thanh_tien,
            "NHAP",
            nguoi_tao,
            ghi_chu,
          ],
        );

        const order = orderResult[0];

        // 4. Create order details
        for (let i = 0; i < validatedDetails.length; i++) {
          const detail = validatedDetails[i];
          await uow.query(
            `INSERT INTO tm_don_hang_chi_tiet (
                            so_don_hang, stt, ma_hang_hoa, so_luong_dat,
                            don_gia, yeu_cau_dac_biet, ghi_chu
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              so_don_hang,
              i + 1,
              detail.ma_hang_hoa,
              detail.so_luong_dat,
              detail.don_gia,
              JSON.stringify(detail.yeu_cau_dac_biet || {}),
              detail.ghi_chu,
            ],
          );
        }

        // 5. Lock inventory if BAN_HANG or CHUYEN_KHO
        if (loai_don_hang === "BAN_HANG" || loai_don_hang === "CHUYEN_KHO") {
          for (const detail of validatedDetails) {
            if (detail.loai_quan_ly === "BATCH") {
              await TonKhoRepository.lockInventory(
                detail.ma_hang_hoa,
                ma_ben_xuat,
                detail.so_luong_dat,
                uow.client,
              );

              // Record lock
              await uow.query(
                `INSERT INTO tm_hang_hoa_khoa (
                                    ma_hang_hoa, ma_kho, so_phieu, loai_phieu, so_luong_khoa
                                ) VALUES ($1, $2, $3, $4, $5)`,
                [
                  detail.ma_hang_hoa,
                  ma_ben_xuat,
                  so_don_hang,
                  "DON_HANG",
                  detail.so_luong_dat,
                ],
              );
            }
          }
        }

        // 6. Log audit
        await this._logAudit(
          uow.client,
          "INSERT",
          "tm_don_hang",
          order.id,
          null,
          order,
          nguoi_tao,
        );

        logger.info(`Order created: ${so_don_hang}`, {
          loai_don_hang,
          thanh_tien,
        });

        return order;
      });

      return {
        success: true,
        data: result,
        message: "Đơn hàng được tạo thành công",
      };
    } catch (error) {
      logger.error("CreateDonHangUseCase failed", error);
      throw error;
    }
  }

  /**
   * Validate input data
   */
  _validateInput(data) {
    const required = [
      "so_don_hang",
      "loai_don_hang",
      "ngay_dat_hang",
      "ma_ben_xuat",
      "loai_ben_xuat",
      "ma_ben_nhap",
      "loai_ben_nhap",
      "nguoi_tao",
    ];

    for (const field of required) {
      if (!data[field]) {
        throw new Error(`${field} is required`);
      }
    }

    if (!data.chi_tiet || data.chi_tiet.length === 0) {
      throw new Error("Order must have at least one item");
    }

    // Business rule: Cannot transfer to same warehouse
    if (
      data.loai_don_hang === "CHUYEN_KHO" &&
      data.ma_ben_xuat === data.ma_ben_nhap
    ) {
      throw new Error("Cannot transfer to the same warehouse");
    }
  }

  /**
   * Validate references (warehouses, partners)
   */
  async _validateReferences(
    loaiBenXuat,
    maBenXuat,
    loaiBenNhap,
    maBenNhap,
    client,
  ) {
    if (loaiBenXuat === "KHO") {
      const kho = await KhoRepository.findByMaKho(maBenXuat, client);
      if (!kho) throw new Error(`Warehouse not found: ${maBenXuat}`);
    } else {
      const doiTac = await DoiTacRepository.findByMaDoiTac(maBenXuat, client);
      if (!doiTac) throw new Error(`Partner not found: ${maBenXuat}`);
    }

    if (loaiBenNhap === "KHO") {
      const kho = await KhoRepository.findByMaKho(maBenNhap, client);
      if (!kho) throw new Error(`Warehouse not found: ${maBenNhap}`);
    } else {
      const doiTac = await DoiTacRepository.findByMaDoiTac(maBenNhap, client);
      if (!doiTac) throw new Error(`Partner not found: ${maBenNhap}`);
    }
  }

  /**
   * Validate products and calculate details
   */
  async _validateAndCalculateDetails(
    chiTiet,
    loaiDonHang,
    maBenXuat,
    loaiBenXuat,
    client,
  ) {
    const validated = [];

    for (const item of chiTiet) {
      // Validate product exists
      const product = await HangHoaRepository.findByMaHangHoa(
        item.ma_hang_hoa,
        client,
      );
      if (!product) {
        throw new Error(`Product not found: ${item.ma_hang_hoa}`);
      }

      // Check inventory for sales/transfer
      if (
        (loaiDonHang === "BAN_HANG" || loaiDonHang === "CHUYEN_KHO") &&
        loaiBenXuat === "KHO"
      ) {
        if (product.loai_quan_ly === "BATCH") {
          const available = await TonKhoRepository.getAvailableQuantity(
            item.ma_hang_hoa,
            maBenXuat,
            client,
          );

          if (available < item.so_luong_dat) {
            throw new Error(
              `Insufficient stock for ${product.ten_hang_hoa}. Available: ${available}, Required: ${item.so_luong_dat}`,
            );
          }
        }
      }

      validated.push({
        ...item,
        loai_quan_ly: product.loai_quan_ly,
        thanh_tien: item.so_luong_dat * item.don_gia,
      });
    }

    return validated;
  }

  /**
   * Log audit trail
   */
  async _logAudit(client, action, table, recordId, oldData, newData, userId) {
    await client.query(
      `INSERT INTO sys_audit_log (
                user_id, hanh_dong, ten_bang, ban_ghi_id, du_lieu_cu, du_lieu_moi
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        action,
        table,
        recordId,
        JSON.stringify(oldData),
        JSON.stringify(newData),
      ],
    );
  }
}

module.exports = new CreateDonHangUseCase();
