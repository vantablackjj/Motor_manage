const { pool } = require('../config/database');
const { TRANG_THAI } = require('../config/constants');

class ThuChiService {

  async taoPhieu(data) {
    const {
      so_phieu,
      nguoi_tao,
      ngay_giao_dich,
      ma_kho,
      ma_kh,
      so_tien,
      loai,
      dien_giai
    } = data

    const result = await pool.query(`
      INSERT INTO tm_thu_chi (
        so_phieu, nguoi_tao, ngay_giao_dich,
        ma_kho, ma_kh, so_tien, loai,
        dien_giai, trang_thai
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [
      so_phieu,
      nguoi_tao,
      ngay_giao_dich,
      ma_kho,
      ma_kh,
      so_tien,
      loai,
      dien_giai || null,
      TRANG_THAI.NHAP
    ])

    return result.rows[0]
  }

  async guiDuyet(so_phieu, nguoi_gui) {
    

    const result = await pool.query(`
      UPDATE tm_thu_chi
      SET trang_thai = $1,
          nguoi_gui = $2,
          ngay_gui = NOW()
      WHERE so_phieu = $3
        AND trang_thai = $4
      RETURNING *
    `, [
      TRANG_THAI.GUI_DUYET,
      nguoi_gui,
      so_phieu,
      TRANG_THAI.NHAP
    ])

    if (result.rowCount === 0) {
      throw new Error("Phiếu không hợp lệ để gửi duyệt")
    }

    return result.rows[0]
  }

  async pheDuyet(so_phieu, nguoi_duyet) {
    const result = await pool.query(`
      UPDATE tm_thu_chi
      SET trang_thai = $1,
          nguoi_duyet = $2,
          ngay_duyet = NOW()
      WHERE so_phieu = $3
        AND trang_thai = $4
      RETURNING *
    `, [
      TRANG_THAI.DA_DUYET,
      nguoi_duyet,
      so_phieu,
      TRANG_THAI.GUI_DUYET
    ])

    if (result.rowCount === 0) {
      throw new Error("Phiếu không ở trạng thái chờ duyệt")
    }

    return result.rows[0]
  }

  async huyPhieu(so_phieu, nguoi_huy, ly_do) {
    const result = await pool.query(`
      UPDATE tm_thu_chi
      SET trang_thai = $1,
          nguoi_huy = $2,
          ly_do_huy = $3,
          ngay_huy = NOW()
      WHERE so_phieu = $4
        AND trang_thai IN ($5,$6)
      RETURNING *
    `, [
      TRANG_THAI.DA_HUY,
      nguoi_huy,
      ly_do || null,
      so_phieu,
      TRANG_THAI.NHAP,
      TRANG_THAI.GUI_DUYET
    ])

    if (result.rowCount === 0) {
      throw new Error("Không thể hủy phiếu đã duyệt")
    }

    return result.rows[0]
  }

  async getDanhSach(filter = {}) {
  const {
    loai,
    trang_thai,
    ma_kho,
    ma_kh,
    tu_ngay,
    den_ngay,
    keyword,
    page = 1,
    limit = 20
  } = filter

  const conditions = []
  const values = []

  if (loai) {
    values.push(loai)
    conditions.push(`loai = $${values.length}`)
  }

  if (trang_thai) {
    values.push(trang_thai)
    conditions.push(`trang_thai = $${values.length}`)
  }

  if (ma_kho) {
    values.push(ma_kho)
    conditions.push(`ma_kho = $${values.length}`)
  }

  if (ma_kh) {
    values.push(ma_kh)
    conditions.push(`ma_kh = $${values.length}`)
  }

  if (tu_ngay) {
    values.push(tu_ngay)
    conditions.push(`ngay_giao_dich >= $${values.length}`)
  }

  if (den_ngay) {
    values.push(den_ngay)
    conditions.push(`ngay_giao_dich <= $${values.length}`)
  }

  if (keyword) {
    values.push(`%${keyword}%`)
    conditions.push(`(
      so_phieu ILIKE $${values.length}
      OR dien_giai ILIKE $${values.length}
    )`)
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : ""

  const offset = (page - 1) * limit
  values.push(limit, offset)

  const sql = `
    SELECT
      id,
      so_phieu,
      loai,
      so_tien,
      trang_thai,
      ma_kho,
      ma_kh,
      ngay_giao_dich,
      nguoi_tao,
      ngay_tao
    FROM tm_thu_chi
    ${whereClause}
    ORDER BY ngay_tao DESC
    LIMIT $${values.length - 1}
    OFFSET $${values.length}
  `

  const result = await pool.query(sql, values)

  return {
    page,
    limit,
    total: result.rowCount,
    data: result.rows
  }
}

async getChiTiet(so_phieu) {
  const result = await pool.query(`
    SELECT
      id,
      so_phieu,
      loai,
      so_tien,
      dien_giai,
      trang_thai,
      ma_kho,
      ma_kh,
      ngay_giao_dich,
      nguoi_tao,
      ngay_tao,
      nguoi_gui,
      ngay_gui,
      nguoi_duyet,
      ngay_duyet,
      
      dien_giai,
      ngay_duyet
    FROM tm_thu_chi
    WHERE so_phieu = $1
  `, [so_phieu])

  return result.rows[0] || null
}


}

module.exports = new ThuChiService()
