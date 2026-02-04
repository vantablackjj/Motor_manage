# Hướng dẫn Workflow Phê duyệt Giao hàng

## Tổng quan

Đã thêm quy trình phê duyệt cho việc giao hàng (xe/phụ tùng). Workflow mới như sau:

### Flow cũ:

```
NHAP → DA_XUAT → DA_GIAO → DA_THANH_TOAN
```

### Flow mới:

```
NHAP → DA_XUAT → CHO_DUYET_GIAO → DA_DUYET_GIAO → DA_GIAO → DA_THANH_TOAN
```

## Các trạng thái mới

| Trạng thái       | Mô tả                   | Người thực hiện                 |
| ---------------- | ----------------------- | ------------------------------- |
| `CHO_DUYET_GIAO` | Chờ duyệt giao hàng     | Nhân viên/Quản lý chi nhánh gửi |
| `DA_DUYET_GIAO`  | Đã duyệt, sẵn sàng giao | Quản lý phê duyệt               |

## API Endpoints

### 1. Gửi duyệt giao hàng

**Endpoint:** `PATCH /api/hoa-don-ban/:so_hd/gui-duyet-giao`

**Điều kiện:**

- Hóa đơn phải ở trạng thái `DA_XUAT`
- Quyền: ADMIN, NHAN_VIEN, QUAN_LY_CHI_NHANH

**Request:**

```http
PATCH /api/hoa-don-ban/HD20260204000001/gui-duyet-giao
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "message": "Gửi duyệt giao hàng thành công",
  "data": {
    "so_hoa_don": "HD20260204000001",
    "trang_thai": "CHO_DUYET_GIAO",
    "nguoi_gui_duyet_giao": 1,
    "ngay_gui_duyet_giao": "2026-02-04T02:47:00.000Z"
  }
}
```

---

### 2. Phê duyệt giao hàng

**Endpoint:** `PATCH /api/hoa-don-ban/:so_hd/phe-duyet-giao`

**Điều kiện:**

- Hóa đơn phải ở trạng thái `CHO_DUYET_GIAO`
- Quyền: ADMIN, QUAN_LY_CHI_NHANH, QUAN_LY_CTY

**Request:**

```http
PATCH /api/hoa-don-ban/HD20260204000001/phe-duyet-giao
Authorization: Bearer <token>
Content-Type: application/json

{
  "ghi_chu": "Đã kiểm tra đầy đủ, đồng ý giao hàng"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Phê duyệt giao hàng thành công",
  "data": {
    "so_hoa_don": "HD20260204000001",
    "trang_thai": "DA_DUYET_GIAO",
    "nguoi_duyet_giao": 2,
    "ngay_duyet_giao": "2026-02-04T02:48:00.000Z",
    "ghi_chu_duyet_giao": "Đã kiểm tra đầy đủ, đồng ý giao hàng"
  }
}
```

---

### 3. Xác nhận đã giao hàng

**Endpoint:** `PATCH /api/hoa-don-ban/:so_hd/xac-nhan-da-giao`

**Điều kiện:**

- Hóa đơn phải ở trạng thái `DA_DUYET_GIAO`
- Quyền: ADMIN, NHAN_VIEN, QUAN_LY_CHI_NHANH

**Request:**

```http
PATCH /api/hoa-don-ban/HD20260204000001/xac-nhan-da-giao
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "message": "Xác nhận đã giao hàng thành công",
  "data": {
    "so_hoa_don": "HD20260204000001",
    "trang_thai": "DA_GIAO"
  }
}
```

---

## Cập nhật UI

### 1. Danh sách hóa đơn

Thêm filter cho trạng thái mới:

```javascript
const TRANG_THAI_OPTIONS = [
  { value: "NHAP", label: "Nháp" },
  { value: "DA_XUAT", label: "Đã xuất kho" },
  { value: "CHO_DUYET_GIAO", label: "Chờ duyệt giao" }, // MỚI
  { value: "DA_DUYET_GIAO", label: "Đã duyệt giao" }, // MỚI
  { value: "DA_GIAO", label: "Đã giao hàng" },
  { value: "DA_THANH_TOAN", label: "Đã thanh toán" },
  { value: "HUY", label: "Đã hủy" },
];
```

### 2. Chi tiết hóa đơn - Action Buttons

```javascript
// Hiển thị button tùy theo trạng thái
const renderActionButtons = (hoaDon) => {
  const { trang_thai } = hoaDon;

  switch (trang_thai) {
    case "DA_XUAT":
      return (
        <Button
          type="primary"
          onClick={() => handleGuiDuyetGiao(hoaDon.so_hoa_don)}
        >
          Gửi duyệt giao hàng
        </Button>
      );

    case "CHO_DUYET_GIAO":
      // Chỉ hiển thị cho quản lý
      if (isManager) {
        return (
          <>
            <Button
              type="primary"
              onClick={() => handlePheDuyetGiao(hoaDon.so_hoa_don)}
            >
              Phê duyệt giao
            </Button>
            <Button danger onClick={() => handleTuChoiGiao(hoaDon.so_hoa_don)}>
              Từ chối
            </Button>
          </>
        );
      }
      return <Tag color="orange">Chờ duyệt giao</Tag>;

    case "DA_DUYET_GIAO":
      return (
        <Button
          type="primary"
          onClick={() => handleXacNhanDaGiao(hoaDon.so_hoa_don)}
        >
          Xác nhận đã giao
        </Button>
      );

    case "DA_GIAO":
      return <Tag color="green">Đã giao hàng</Tag>;

    default:
      return null;
  }
};
```

### 3. Hiển thị thông tin phê duyệt

```javascript
// Trong chi tiết hóa đơn, hiển thị timeline phê duyệt giao
{
  hoaDon.nguoi_gui_duyet_giao && (
    <Descriptions.Item label="Người gửi duyệt giao">
      {hoaDon.ten_nguoi_gui_duyet_giao} -{" "}
      {formatDate(hoaDon.ngay_gui_duyet_giao)}
    </Descriptions.Item>
  );
}

{
  hoaDon.nguoi_duyet_giao && (
    <>
      <Descriptions.Item label="Người duyệt giao">
        {hoaDon.ten_nguoi_duyet_giao} - {formatDate(hoaDon.ngay_duyet_giao)}
      </Descriptions.Item>
      {hoaDon.ghi_chu_duyet_giao && (
        <Descriptions.Item label="Ghi chú duyệt">
          {hoaDon.ghi_chu_duyet_giao}
        </Descriptions.Item>
      )}
    </>
  );
}
```

---

## Lưu ý quan trọng

1. **Không thể bỏ qua bước phê duyệt**: Hóa đơn phải đi qua đầy đủ các bước
2. **Quyền hạn**:
   - Nhân viên: Gửi duyệt, Xác nhận đã giao
   - Quản lý: Phê duyệt giao hàng
3. **Báo cáo**: Các báo cáo doanh thu vẫn tính trên trạng thái `DA_GIAO` và `DA_THANH_TOAN`

---

## Migration đã chạy

✅ Đã thêm 2 trạng thái mới vào enum
✅ Đã thêm 5 cột tracking vào bảng `tm_hoa_don`:

- `nguoi_gui_duyet_giao`
- `ngay_gui_duyet_giao`
- `nguoi_duyet_giao`
- `ngay_duyet_giao`
- `ghi_chu_duyet_giao`

✅ Đã tạo index cho performance
✅ Đã implement service methods
✅ Đã tạo API endpoints

---

## Testing

Bạn có thể test workflow bằng cách:

1. Tạo hóa đơn mới
2. Xuất kho (DA_XUAT)
3. Gửi duyệt giao: `PATCH /api/hoa-don-ban/:so_hd/gui-duyet-giao`
4. Phê duyệt: `PATCH /api/hoa-don-ban/:so_hd/phe-duyet-giao`
5. Xác nhận đã giao: `PATCH /api/hoa-don-ban/:so_hd/xac-nhan-da-giao`
