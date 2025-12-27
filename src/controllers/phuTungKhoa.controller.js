const PhuTungKhoaService = require('../services/phuTungKhoa.service');

exports.lock = async (req, res) => {
  try {
    await PhuTungKhoaService.lock(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.unlock = async (req, res) => {
  try {
    const { so_phieu } = req.params;
    await PhuTungKhoaService.unlockBySoPhieu(so_phieu);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getByKho = async (req, res) => {
  const { ma_kho } = req.params;
  const data = await PhuTungKhoaService.getByKho(ma_kho);
  res.json({ success: true, data });
};
