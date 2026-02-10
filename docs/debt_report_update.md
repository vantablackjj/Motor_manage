# Báo Cáo Công Nợ - Cập Nhật Tính Năng

## Tổng Quan

API báo cáo công nợ đã được cập nhật để hiển thị **cả công nợ khách hàng (phải thu) VÀ công nợ nhà cung cấp (phải trả)** trong một báo cáo tổng hợp.

## Endpoint

```
GET /api/bao-cao/cong-no/khach-hang
```

## Các Tham Số Query

| Tham số        | Loại   | Mô tả                                                                                                             |
| -------------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| `loai_cong_no` | string | Optional. Giá trị: `PHAI_THU` (chỉ khách hàng), `PHAI_TRA` (chỉ nhà cung cấp). Nếu không truyền, sẽ trả về cả hai |
| `ma_kh`        | string | Optional. Mã khách hàng cụ thể                                                                                    |
| `ma_ncc`       | string | Optional. Mã nhà cung cấp cụ thể                                                                                  |
| `tu_ngay`      | date   | Optional. Ngày bắt đầu (format: YYYY-MM-DD)                                                                       |
| `den_ngay`     | date   | Optional. Ngày kết thúc (format: YYYY-MM-DD)                                                                      |

## Ví Dụ Sử Dụng

### 1. Lấy tất cả công nợ (khách hàng + nhà cung cấp)

```
GET /api/bao-cao/cong-no/khach-hang?tu_ngay=2026-02-01&den_ngay=2026-02-10
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "ho_ten": "Nguyễn Văn A",
      "ma_doi_tac": "KH001",
      "loai_doi_tac": "KHACH_HANG",
      "loai_cong_no": "PHAI_THU",
      "tong_phai_tra": 50000000,
      "da_tra": 20000000,
      "con_lai": 30000000,
      "ngay_cap_nhat": "2026-02-10T06:00:00.000Z"
    },
    {
      "ho_ten": "Công ty ABC",
      "ma_doi_tac": "NCC001",
      "loai_doi_tac": "NHA_CUNG_CAP",
      "loai_cong_no": "PHAI_TRA",
      "tong_phai_tra": 100000000,
      "da_tra": 50000000,
      "con_lai": 50000000,
      "ngay_cap_nhat": "2026-02-09T06:00:00.000Z"
    }
  ],
  "summary": {
    "tong_phai_thu": 30000000,
    "tong_phai_tra": 50000000,
    "so_khach_hang_no": 1,
    "so_nha_cung_cap_no": 1
  }
}
```

### 2. Chỉ lấy công nợ khách hàng

```
GET /api/bao-cao/cong-no/khach-hang?loai_cong_no=PHAI_THU&tu_ngay=2026-02-01&den_ngay=2026-02-10
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "ho_ten": "Nguyễn Văn A",
      "ma_kh": "KH001",
      "loai_cong_no": "PHAI_THU",
      "tong_phai_tra": 50000000,
      "da_tra": 20000000,
      "con_lai": 30000000,
      "ngay_cap_nhat": "2026-02-10T06:00:00.000Z"
    }
  ]
}
```

### 3. Chỉ lấy công nợ nhà cung cấp

```
GET /api/bao-cao/cong-no/khach-hang?loai_cong_no=PHAI_TRA&tu_ngay=2026-02-01&den_ngay=2026-02-10
```

## Cấu Trúc Response

### Khi lấy tất cả (không có `loai_cong_no`)

- `success`: boolean - Trạng thái thành công
- `data`: array - Danh sách công nợ
  - `ho_ten`: string - Tên đối tác
  - `ma_doi_tac`: string - Mã đối tác
  - `loai_doi_tac`: string - "KHACH_HANG" hoặc "NHA_CUNG_CAP"
  - `loai_cong_no`: string - "PHAI_THU" hoặc "PHAI_TRA"
  - `tong_phai_tra`: number - Tổng nợ
  - `da_tra`: number - Đã thanh toán
  - `con_lai`: number - Còn lại
  - `ngay_cap_nhat`: datetime - Ngày cập nhật
- `summary`: object - Tổng hợp
  - `tong_phai_thu`: number - Tổng phải thu từ khách hàng
  - `tong_phai_tra`: number - Tổng phải trả cho nhà cung cấp
  - `so_khach_hang_no`: number - Số khách hàng còn nợ
  - `so_nha_cung_cap_no`: number - Số nhà cung cấp còn nợ

### Khi lọc theo loại cụ thể (`loai_cong_no=PHAI_THU` hoặc `PHAI_TRA`)

- `success`: boolean - Trạng thái thành công
- `data`: array - Danh sách công nợ (không có summary)

## Thay Đổi Kỹ Thuật

### 1. Service Layer (`baoCao.service.js`)

- Phương thức `congNoKhachHang()` đã được cập nhật để:
  - Hỗ trợ tham số `loai_cong_no` để lọc theo loại
  - Sử dụng UNION ALL để kết hợp dữ liệu từ cả khách hàng và nhà cung cấp
  - Tính toán tổng hợp (summary) tự động
  - Sắp xếp theo loại công nợ và số tiền còn lại

### 2. Controller Layer (`baoCao.controller.js`)

- Phương thức `congNoKhachHang()` đã được đơn giản hóa
- Tự động xử lý cả định dạng cũ (array) và mới (object với data + summary)

## Lưu Ý

- API tương thích ngược: vẫn hoạt động với code cũ khi truyền `loai_cong_no`
- Dữ liệu được sắp xếp theo: loại công nợ (PHAI_THU trước) → số tiền còn lại (giảm dần)
- Chỉ hiển thị các khoản nợ còn dư (`con_lai > 0`)
