# API Documentation – Motor Manage Backend

## Base URL

```
http://localhost:3000/api
```

## Authentication

Tất cả API (trừ login) yêu cầu JWT.

Header:

```http
Authorization: Bearer <access_token>
```

---

## 1. AUTH

### POST /auth/login

Đăng nhập hệ thống.

**Body**

```json
{
  "username": "admin3",
  "password": "12345678"
}
```

---

## 2. KHO

### GET/kho:ma_kho

lấy chi tiết kho

### GET /kho

Lấy danh sách kho.

### POST /kho

Tạo kho mới.

### PUT /kho/:ma_kho

Cập nhật kho.

### DELETE /kho/:ma_kho

Xóa kho.

---

## 3. PHỤ TÙNG

### GET /phu-tung

### GET /phu-tung/ton-kho/:ma_kho

Danh sách phụ tùng.

### POST /phu-tung

Thêm phụ tùng.

### PUT /phu-tung/:ma_pt

Cập nhật phụ tùng.

### DELETE /phu-tung/:ma_pt

Xóa phụ tùng.

---

## 4. TỒN KHO

### GET /ton-kho

Lấy tồn kho tổng.

### GET /ton-kho/:ma_kho

Lấy tồn kho theo kho.

### post /increase and decrease

tăng lượng hàng(ma_kho,ma_sp,qty)


---

## 5. XE

### GET /xe/ton-kho/:ma_kho
     
Lấy tồn kho xe theo kho.

**Query params**

* ma_loai_xe
* ma_mau
* locked

### GET /xe/:xe_key

Lấy thông tin xe.

### GET /xe/:xe_key/lich-su

Lấy lịch sử xe.

### POST /xe

Thêm xe mới.

**Body**

```json
{
  "xe_key": "XE001",
  "ma_loai_xe": "LX01",
  "ma_mau": "RED",
  "so_khung": "SK123",
  "so_may": "SM123",
  "ma_kho_hien_tai": "KHO01",
  "ngay_nhap": "2025-01-01",
  "gia_nhap": 20000000,
  "ghi_chu": ""
}
```

---

## 6. ĐƠN HÀNG MUA

### GET /
        /:ma_phieu

Danh sách đơn hàng mua.

### POST /

Tạo đơn hàng mua.

### POST /:ma_phieu/chi-tiet
                    /:ma_phieu/chi-tiet(them phu tung)
                    /gui-duyet
                    /phe-duyet
                    /huy-duyet

---

## 7. HÓA ĐƠN BÁN

### GET /
        /ma_phieu
Danh sách hóa đơn bán.

### POST /
        /gui-duyet
        /phe-duyet
        /:ma-phieu/)
Tạo hóa đơn bán.

---

## 8. HÓA ĐƠN MUA XE

### POST /hoa-don-mua-xe

Tạo hóa đơn mua xe.

---

## 9. CHUYỂN KHO

### POST /chuyen-kho

Tạo phiếu chuyển kho.

### POST /chuyen-kho/:ma_phieu/phe-duyet

Phê duyệt chuyển kho.

### POST /chuyen-kho/:ma_phieu/tu-choi

Từ chối chuyển kho.

---

## 10. THU / CHI

### GET /thu-chi

Danh sách phiếu thu chi.

### POST /thu-chi

Tạo phiếu thu / chi.

### PUT /thu-chi/:id

Cập nhật phiếu thu / chi.

---

## 11. DANH MỤC

### Brand

* GET /brand
* POST /brand

### Color

* GET /color
* POST /color

### Loại hình

* GET /loai-hinh

### Nơi sản xuất

* GET /noi-sx

### Model xe

* GET /model-car

### Màu xe

* GET /car-color

---

## Ghi chú

* Backend theo mô hình Controller – Service – Model
* Validate bằng Joi
* Phân quyền bằng JWT + Role
