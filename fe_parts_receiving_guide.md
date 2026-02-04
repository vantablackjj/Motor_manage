# Frontend Prompt: Implement Spare Parts Receiving (Nhập kho phụ tùng)

## Goal

Implement the UI/UX for receiving "Spare Parts" (Phụ tùng) from a Purchase Order. This feature allows users to receive parts into the warehouse _after_ the order has been approved (`DA_DUYET`). It supports **partial receiving** (receiving items in multiple batches).

## Context

- **Module**: Purchase Order (Đơn hàng mua - Phụ tùng)
- **Current State**: Users can create and approve orders.
- **New Requirement**: Add a "Nhập kho" (Receive) action that opens a modal to confirm the quantity being received for each item.

## Backend API Specification

The backend is ready. Use the following endpoint:

- **Endpoint**: `POST /api/v1/don-hang-mua/:ma_phieu/nhap-kho`
- **Payload**:
  ```json
  {
    "danh_sach_hang": [
      {
        "id": 123, // ID of the PO line item (tm_don_hang_chi_tiet.id)
        "so_luong_nhap": 10, // Quantity to receive in this batch
        "don_gia": 50000 // Optional: Override cost price if different
      },
      {
        "id": 124,
        "so_luong_nhap": 5
      }
    ]
  }
  ```
- **Response**: `{ success: true, message: "Nhập kho thành công" }`

## Data Structure Updates

The PO Detail API (`GET /api/v1/don-hang-mua/:ma_phieu`) already returns line items (`chi_tiet`).
Ensure you use these fields from the item:

- `so_luong_dat` (Ordered Quantity)
- `so_luong_da_giao` (Delivered Quantity - _This updates as you receive_)
- `so_luong_con_lai` (Remaining = Ordered - Delivered) -> _Calculate this in FE if missing._

## UI Implementation Tasks

### 1. Update `PurchaseOrderDetail` (Page)

- **Condition**: Show the "Nhập kho" button ONLY if:
  - `trang_thai` is `DA_DUYET` or `DANG_NHAP`.
  - The current user has permission (Warehouse Keeper usually).
- **Action**: Clicking "Nhập kho" opens the `PartReceivingModal`.

### 2. Create `PartReceivingModal` (Component)

This modal allows mass-receiving for all items in the order.

**Layout:**

- **Table** displaying items from the PO:
  - Columns: Image, Product Name, Unit, Ordered Qty, **Received Qty** (Display Only), **Receiving Qty** (Input/Number).
- **Logic**:
  - The "Receiving Qty" input should default to `Ordered - Received` (the remaining amount).
  - Validation: User CANNOT enter a "Receiving Qty" > "Remaining Qty".
  - Allow users to receive 0 for some items (if they only received a partial shipment).
  - "Submit" button calls the API with the array of items that have `so_luong_nhap > 0`.

### 3. Handle Unit Conversion (IMPORTANT)

The user may have ordered in one unit (e.g. "Box") but wants to store in another (e.g. "Piece").

- **Add a column/input for "Exchange Rate" (Hệ số đổi)**: Default is `1`.
- If the user changes it (e.g. to `20`), show the "Converted Qty" = `Receiving Qty` \* `20`.
- **Payload update**:
  ```json
  {
    "danh_sach_hang": [
      {
        "id": 123,
        "so_luong_nhap": 1, // User enters 1 (Box)
        "he_so_doi": 20 // User enters 20 (Items/Box)
      }
    ]
  }
  ```
- The Backend will:
  - Add `1 * 20 = 20` items to Inventory.
  - Mark `1` unit as Delivered in the PO.
  - Calculate Unit Cost = `Total Cost / 20`.

### 4. Handle Status Updates

- After successful receiving, refresh the PO details.
- If `so_luong_da_giao` reaches `so_luong_dat` for ALL items, the backend automatically sets status to `HOAN_THANH` (Completed).
- If partially received, status becomes `DANG_NHAP` (Receiving).
- Update the status badge/tag on the UI accordingly (Add `DANG_NHAP` color if missing).

## Example Code Snippet (React/Ant Design)

```jsx
// Handler for submitting the modal
const handleReceiveSubmit = async (values) => {
  const payload = {
    danh_sach_hang: values.items
      .filter((item) => item.so_luong_nhap > 0)
      .map((item) => ({
        id: item.id,
        so_luong_nhap: item.so_luong_nhap,
      })),
  };

  try {
    await purchaseOrderAPI.receiveParts(maPhieu, payload); // Implement this in API service
    message.success("Nhập kho thành công!");
    fetchDetail(); // Reload data
    setModalVisible(false);
  } catch (error) {
    message.error(error.message);
  }
};
```

## Styling

- Ensure the input fields for quantity are prominent.
- Use a clear visual indicator for "Remaining Quantity".
- If an item is fully received (`Received == Ordered`), disable its input or hide it, or visually mark it as "Done".
