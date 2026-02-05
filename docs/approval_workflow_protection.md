# Báo cáo: Thắt chặt quy trình phê duyệt đơn hàng

## Tổng quan

Đã thực hiện các thay đổi để ngăn chặn mọi hành động chỉnh sửa đơn hàng sau khi đã được phê duyệt, đảm bảo tính toàn vẹn dữ liệu và quy trình nghiệp vụ.

## 1. Bảo vệ Backend (order.service.js)

### 1.1. Phương thức `updateOrder`

**Mục đích**: Cập nhật thông tin header (VAT, Chiết khấu, Ghi chú)

**Kiểm tra nghiêm ngặt**:

```javascript
if (order.trang_thai !== "NHAP") {
  throw new Error(
    `Không thể chỉnh sửa đơn hàng ở trạng thái ${order.trang_thai}. ` +
      `Chỉ được phép chỉnh sửa khi đơn hàng ở trạng thái Nháp (NHAP).`,
  );
}
```

**Hành vi**:

- ✅ Cho phép: Đơn hàng ở trạng thái `NHAP`
- ❌ Chặn: Tất cả các trạng thái khác (GUI_DUYET, DA_DUYET, DANG_GIAO, HOAN_THANH, TU_CHOI, HUY)

### 1.2. Phương thức `addItemToOrder`

**Mục đích**: Thêm sản phẩm (xe/phụ tùng) vào đơn hàng

**Kiểm tra nghiêm ngặt**:

```javascript
if (order.trang_thai !== "NHAP") {
  throw new Error(
    `Không thể thêm sản phẩm vào đơn hàng ở trạng thái ${order.trang_thai}. ` +
      `Chỉ được phép thêm sản phẩm khi đơn hàng ở trạng thái Nháp (NHAP).`,
  );
}
```

**Hành vi**:

- ✅ Cho phép: Đơn hàng ở trạng thái `NHAP`
- ❌ Chặn: Tất cả các trạng thái khác

### 1.3. Phương thức `removeItemFromOrder`

**Mục đích**: Xóa sản phẩm khỏi đơn hàng

**Kiểm tra nghiêm ngặt**:

```javascript
if (order.trang_thai !== "NHAP") {
  throw new Error(
    `Không thể xóa sản phẩm khỏi đơn hàng ở trạng thái ${order.trang_thai}. ` +
      `Chỉ được phép xóa sản phẩm khi đơn hàng ở trạng thái Nháp (NHAP).`,
  );
}
```

**Hành vi**:

- ✅ Cho phép: Đơn hàng ở trạng thái `NHAP`
- ❌ Chặn: Tất cả các trạng thái khác

## 2. Bảo vệ Frontend (SalesOrderDetail.jsx)

### 2.1. Biến kiểm soát

```javascript
const isEditable = trang_thai === "NHAP";
```

### 2.2. Các thành phần được kiểm soát

#### a. Nút "Sửa" trong Summary Box (dòng 585-600)

```jsx
{
  isEditable && (
    <Button
      type="link"
      icon={<EditOutlined />}
      onClick={() => {
        headerForm.setFieldsValue({
          vat_percentage: data.vat_percentage,
          chiet_khau: data.chiet_khau,
          ghi_chu: data.ghi_chu,
        });
        setHeaderModalVisible(true);
      }}
    >
      Sửa
    </Button>
  );
}
```

#### b. Nút "Thêm xe" (dòng 654-667)

```jsx
{
  isEditable && (
    <Button
      type="dashed"
      icon={<PlusOutlined />}
      onClick={() => {
        fetchAvailableVehicles();
        setVehicleModalVisible(true);
      }}
      style={{ marginBottom: 16 }}
      block
    >
      Thêm xe
    </Button>
  );
}
```

#### c. Nút "Thêm phụ tùng" (dòng 684-697)

```jsx
{
  isEditable && (
    <Button
      type="dashed"
      icon={<PlusOutlined />}
      onClick={() => {
        fetchAvailableParts();
        setPartModalVisible(true);
      }}
      style={{ marginBottom: 16 }}
      block
    >
      Thêm phụ tùng
    </Button>
  );
}
```

#### d. Nút "Xóa" trong bảng xe (dòng 392-399)

```jsx
{
  title: "",
  key: "action",
  render: (_, record) =>
    isEditable && (
      <Popconfirm
        title="Xóa xe này?"
        onConfirm={() => handleDeleteDetail(record.stt)}
      >
        <Button danger size="small" icon={<DeleteOutlined />} />
      </Popconfirm>
    ),
}
```

#### e. Nút "Xóa" trong bảng phụ tùng (dòng 437-444)

```jsx
{
  title: "",
  key: "action",
  render: (_, record) =>
    isEditable && (
      <Popconfirm
        title="Xóa phụ tùng này?"
        onConfirm={() => handleDeleteDetail(record.stt)}
      >
        <Button danger size="small" icon={<DeleteOutlined />} />
      </Popconfirm>
    ),
}
```

## 3. Quy trình phê duyệt được bảo vệ

### 3.1. Luồng trạng thái cho phép

```
NHAP → GUI_DUYET → DA_DUYET → DANG_GIAO → HOAN_THANH
  ↓         ↓
 HUY    TU_CHOI
```

### 3.2. Các hành động được phép theo trạng thái

| Trạng thái | Chỉnh sửa Header | Thêm/Xóa SP | Gửi duyệt | Phê duyệt | Từ chối | Giao hàng |
| ---------- | ---------------- | ----------- | --------- | --------- | ------- | --------- |
| NHAP       | ✅               | ✅          | ✅        | ❌        | ❌      | ❌        |
| GUI_DUYET  | ❌               | ❌          | ❌        | ✅        | ✅      | ❌        |
| DA_DUYET   | ❌               | ❌          | ❌        | ❌        | ❌      | ✅        |
| DANG_GIAO  | ❌               | ❌          | ❌        | ❌        | ❌      | ✅        |
| HOAN_THANH | ❌               | ❌          | ❌        | ❌        | ❌      | ❌        |
| TU_CHOI    | ❌               | ❌          | ❌        | ❌        | ❌      | ❌        |
| HUY        | ❌               | ❌          | ❌        | ❌        | ❌      | ❌        |

## 4. Thông báo lỗi cho người dùng

### 4.1. Khi cố chỉnh sửa header

```
Không thể chỉnh sửa đơn hàng ở trạng thái DA_DUYET.
Chỉ được phép chỉnh sửa khi đơn hàng ở trạng thái Nháp (NHAP).
```

### 4.2. Khi cố thêm sản phẩm

```
Không thể thêm sản phẩm vào đơn hàng ở trạng thái DA_DUYET.
Chỉ được phép thêm sản phẩm khi đơn hàng ở trạng thái Nháp (NHAP).
```

### 4.3. Khi cố xóa sản phẩm

```
Không thể xóa sản phẩm khỏi đơn hàng ở trạng thái DA_DUYET.
Chỉ được phép xóa sản phẩm khi đơn hàng ở trạng thái Nháp (NHAP).
```

## 5. Bảo mật đa lớp

### 5.1. Lớp Frontend (UI)

- Ẩn các nút chỉnh sửa khi `trang_thai !== "NHAP"`
- Người dùng không thấy các tùy chọn không được phép

### 5.2. Lớp Backend (API)

- Kiểm tra trạng thái trước khi thực hiện bất kỳ thay đổi nào
- Ngăn chặn các yêu cầu từ công cụ bên ngoài (Postman, curl, etc.)
- Trả về thông báo lỗi rõ ràng

## 6. Lưu ý quan trọng

### 6.1. Nút "Trả về" trong trạng thái GUI_DUYET

- **Vẫn được giữ lại** vì đây là tính năng hợp lý
- Cho phép quản lý trả đơn về soạn thảo nếu phát hiện sai sót trước khi phê duyệt
- Chỉ hoạt động khi đơn hàng ở trạng thái `GUI_DUYET`

### 6.2. Không có nút "Hủy duyệt" từ DA_DUYET

- Một khi đã phê duyệt, đơn hàng được khóa cứng
- Không thể quay lại trạng thái NHAP hoặc GUI_DUYET
- Đảm bảo tính nghiêm túc của quy trình phê duyệt

## 7. Kết luận

Hệ thống đã được thắt chặt với:

- ✅ Bảo vệ Backend: Kiểm tra nghiêm ngặt tại tầng service
- ✅ Bảo vệ Frontend: Ẩn UI không phù hợp với trạng thái
- ✅ Thông báo lỗi: Rõ ràng, dễ hiểu cho người dùng
- ✅ Quy trình: Đảm bảo tính toàn vẹn dữ liệu

**Ngày cập nhật**: 2026-02-05
**Người thực hiện**: AI Assistant
