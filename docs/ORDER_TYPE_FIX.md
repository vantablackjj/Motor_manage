# Order Type vs Transaction Type - API Fix

## Problem

The frontend was sending `loai_don_hang=XUAT_KHO` to the `/api/orders` endpoint, which caused a database enum validation error:

```
invalid input value for enum enum_loai_don_hang: "XUAT_KHO"
```

## Root Cause

There's a confusion between two different concepts:

### 1. **Order Types** (`loai_don_hang` - for `tm_don_hang` table)

These represent business orders/contracts:

- `MUA_HANG` - Purchase Order (from supplier)
- `BAN_HANG` - Sales Order (to customer)
- `CHUYEN_KHO` - Transfer Order (between warehouses)

### 2. **Warehouse Transaction Types** (`loai_giao_dich` - for warehouse movements)

These represent physical inventory movements:

- `NHAP_KHO` - Warehouse Entry
- `XUAT_KHO` - Warehouse Exit ❌ **NOT an order type!**
- `XUAT_BAN` - Sales Exit
- `XUAT_CHUYEN` - Transfer Exit
- `NHAP_MUA` - Purchase Entry
- `NHAP_CHUYEN` - Transfer Entry

## Solution

### Backend Changes (Already Applied)

1. ✅ Added validation in `order.service.js` to reject invalid `loai_don_hang` values
2. ✅ Updated `constants.js` to clearly separate `LOAI_DON_HANG` from `LOAI_GIAO_DICH`
3. ✅ Improved error messages to guide developers

### Frontend Changes Required

If you're trying to query warehouse exits, you should:

**Option 1: Query warehouse transactions instead**

```javascript
// Instead of:
GET /api/orders?loai_don_hang=XUAT_KHO

// Use warehouse/inventory endpoint:
GET /api/warehouse/transactions?loai_giao_dich=XUAT_KHO
```

**Option 2: Query sales orders**

```javascript
// If you want orders that result in warehouse exits:
GET /api/orders?loai_don_hang=BAN_HANG
```

**Option 3: Query invoices**

```javascript
// If you want completed deliveries:
GET /api/invoices?loai_hoa_don=BAN_HANG&trang_thai=DA_GIAO
```

## Valid API Usage

### Get Purchase Orders

```javascript
GET /api/orders?loai_don_hang=MUA_HANG&status=true&page=1&limit=20
```

### Get Sales Orders

```javascript
GET /api/orders?loai_don_hang=BAN_HANG&status=true&page=1&limit=20
```

### Get Transfer Orders

```javascript
GET /api/orders?loai_don_hang=CHUYEN_KHO&status=true&page=1&limit=20
```

## Constants Reference

### Use in Frontend

```javascript
// Import from your constants file
import { LOAI_DON_HANG, LOAI_GIAO_DICH } from "@/constants";

// For order queries
const orderType = LOAI_DON_HANG.BAN_HANG; // ✅ Correct

// For warehouse transaction queries
const transactionType = LOAI_GIAO_DICH.XUAT_KHO; // ✅ Correct

// DON'T mix them up!
const wrong = LOAI_GIAO_DICH.XUAT_KHO; // ❌ Wrong for order queries
```

## Error Message

If you see this error, it means you're using the wrong constant:

```json
{
  "success": false,
  "message": "Invalid loai_don_hang value: \"XUAT_KHO\". Valid values are: MUA_HANG, BAN_HANG, CHUYEN_KHO. Note: XUAT_KHO is a warehouse transaction type (loai_phieu_kho), not an order type (loai_don_hang)."
}
```

## Next Steps

1. Find the frontend code making the API call to `/api/orders?loai_don_hang=XUAT_KHO`
2. Determine the actual intent (what data are you trying to fetch?)
3. Use the correct endpoint and parameter based on the tables above
4. Update your code to use the correct constants

## Database Schema Reference

### Orders Table (`tm_don_hang`)

- Stores business orders (PO, SO, TO)
- Uses `enum_loai_don_hang`: MUA_HANG, BAN_HANG, CHUYEN_KHO

### Warehouse Transactions (`tm_phieu_kho`)

- Stores physical inventory movements
- Uses `enum_loai_phieu_kho`: NHAP_MUA, XUAT_BAN, XUAT_CHUYEN, etc.

### Invoices (`tm_hoa_don`)

- Stores delivery/receipt documents
- Created from orders when goods are actually moved
- Links orders to warehouse transactions
