require("dotenv").config();
const { pool } = require("./src/config/database");

/**
 * Script áp dụng permissions - xử lý unique constraint trên ten_quyen
 */
async function applyPermissions() {
  const client = await pool.connect();
  try {
    console.log("\n=== APPLYING ROLE PERMISSIONS ===\n");

    // Lấy constraints để hiểu cấu trúc
    const constraintsResult = await client.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'sys_role'
    `);
    console.log(
      "Constraints:",
      constraintsResult.rows
        .map((r) => `${r.constraint_name}(${r.constraint_type})`)
        .join(", "),
    );

    // Lấy tất cả roles hiện tại
    const existingRoles = await client.query(
      "SELECT id, ten_quyen, ma_quyen FROM sys_role ORDER BY id",
    );
    console.log("\nExisting roles:");
    existingRoles.rows.forEach((r) =>
      console.log(
        `  [${r.id}] ma_quyen='${r.ma_quyen}' ten_quyen='${r.ten_quyen}'`,
      ),
    );

    await client.query("BEGIN");

    const permissionsMap = {
      ADMIN: {
        users: { view: true, create: true, edit: true, delete: true },
        roles: { view: true, create: true, edit: true, delete: true },
        warehouses: { view: true, create: true, edit: true, delete: true },
        products: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          approve: true,
          view_cost: true,
        },
        partners: { view: true, create: true, edit: true, delete: true },
        purchase_orders: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          approve: true,
        },
        sales_orders: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          approve: true,
        },
        invoices: { view: true, create: true, edit: true, delete: true },
        inventory: {
          view: true,
          import: true,
          export: true,
          transfer: true,
          adjust: true,
        },
        debt: { view: true, create: true, edit: true, delete: true },
        payments: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          approve: true,
        },
        reports: { view: true, export: true, view_financial: true },
        settings: { view: true, edit: true },
      },
      BAN_HANG: {
        users: { view: false, create: false, edit: false, delete: false },
        roles: { view: false, create: false, edit: false, delete: false },
        warehouses: { view: true, create: false, edit: false, delete: false },
        products: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          view_cost: false,
        },
        partners: { view: true, create: true, edit: true, delete: false },
        purchase_orders: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
        },
        sales_orders: {
          view: true,
          create: true,
          edit: true,
          delete: false,
          approve: false,
        },
        invoices: { view: true, create: true, edit: false, delete: false },
        inventory: {
          view: true,
          import: false,
          export: true,
          transfer: false,
          adjust: false,
        },
        debt: { view: true, create: true, edit: false, delete: false },
        payments: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
        },
        reports: { view: true, export: true, view_financial: false },
        settings: { view: false, edit: false },
      },
      KHO: {
        users: { view: false, create: false, edit: false, delete: false },
        roles: { view: false, create: false, edit: false, delete: false },
        warehouses: { view: true, create: false, edit: false, delete: false },
        products: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: false,
          view_cost: false,
        },
        partners: { view: true, create: false, edit: false, delete: false },
        purchase_orders: {
          view: true,
          create: true,
          edit: false,
          delete: false,
          approve: false,
        },
        sales_orders: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: false,
        },
        invoices: { view: true, create: true, edit: false, delete: false },
        inventory: {
          view: true,
          import: true,
          export: true,
          transfer: true,
          adjust: false,
        },
        debt: { view: false, create: false, edit: false, delete: false },
        payments: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
        },
        reports: { view: true, export: true, view_financial: false },
        settings: { view: false, edit: false },
      },
      KE_TOAN: {
        users: { view: true, create: false, edit: false, delete: false },
        roles: { view: false, create: false, edit: false, delete: false },
        warehouses: { view: true, create: false, edit: false, delete: false },
        products: {
          view: true,
          create: false,
          edit: true,
          delete: false,
          approve: false,
          view_cost: true,
        },
        partners: { view: true, create: true, edit: true, delete: false },
        purchase_orders: {
          view: true,
          create: false,
          edit: true,
          delete: false,
          approve: true,
        },
        sales_orders: {
          view: true,
          create: false,
          edit: true,
          delete: false,
          approve: true,
        },
        invoices: { view: true, create: false, edit: true, delete: false },
        inventory: {
          view: true,
          import: false,
          export: false,
          transfer: false,
          adjust: true,
        },
        debt: { view: true, create: true, edit: true, delete: true },
        payments: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          approve: true,
        },
        reports: { view: true, export: true, view_financial: true },
        settings: { view: true, edit: false },
      },
      QUAN_LY: {
        users: { view: true, create: true, edit: true, delete: false },
        roles: { view: true, create: false, edit: false, delete: false },
        warehouses: { view: true, create: true, edit: true, delete: false },
        products: {
          view: true,
          create: true,
          edit: true,
          delete: false,
          approve: true,
          view_cost: true,
        },
        partners: { view: true, create: true, edit: true, delete: true },
        purchase_orders: {
          view: true,
          create: true,
          edit: true,
          delete: false,
          approve: true,
        },
        sales_orders: {
          view: true,
          create: true,
          edit: true,
          delete: false,
          approve: true,
        },
        invoices: { view: true, create: true, edit: true, delete: false },
        inventory: {
          view: true,
          import: true,
          export: true,
          transfer: true,
          adjust: true,
        },
        debt: { view: true, create: true, edit: true, delete: false },
        payments: {
          view: true,
          create: true,
          edit: true,
          delete: false,
          approve: true,
        },
        reports: { view: true, export: true, view_financial: true },
        settings: { view: true, edit: true },
      },
    };

    // Mapping: ten_quyen cũ -> ma_quyen mới
    const tenQuyenToMaQuyen = {
      ADMIN: "ADMIN",
      KHO: "KHO",
      KE_TOAN: "KE_TOAN",
      SALE: "BAN_HANG",
      BAN_HANG: "BAN_HANG",
      NHAN_VIEN: "BAN_HANG",
      QUAN_LY: "QUAN_LY",
      QUAN_LY_CTY: "QUAN_LY",
      QUAN_LY_CHI_NHANH: "QUAN_LY",
    };

    // Nhóm roles theo ma_quyen đích
    const groups = {};
    for (const role of existingRoles.rows) {
      const maQuyen =
        tenQuyenToMaQuyen[role.ten_quyen] || tenQuyenToMaQuyen[role.ma_quyen];
      if (!maQuyen) {
        console.log(`  ⚠️ No mapping for: ${role.ten_quyen}`);
        continue;
      }
      if (!groups[maQuyen]) groups[maQuyen] = [];
      groups[maQuyen].push(role);
    }

    // Xử lý từng nhóm
    const newDisplayNames = {
      ADMIN: "Quản trị viên",
      BAN_HANG: "Nhân viên bán hàng",
      KHO: "Nhân viên kho",
      KE_TOAN: "Kế toán",
      QUAN_LY: "Quản lý",
    };
    const newDescriptions = {
      ADMIN: "Toàn quyền quản trị hệ thống",
      BAN_HANG: "Quản lý đơn bán hàng, hóa đơn và khách hàng",
      KHO: "Quản lý nhập xuất kho, chuyển kho và tồn kho",
      KE_TOAN: "Quản lý tài chính, công nợ, thu chi và báo cáo tài chính",
      QUAN_LY:
        "Giám sát toàn diện, phê duyệt nghiệp vụ và xem báo cáo tài chính",
    };

    const primaryIds = {}; // ma_quyen -> primary role id

    for (const [maQuyen, roles] of Object.entries(groups)) {
      const perms = permissionsMap[maQuyen];
      const displayName = newDisplayNames[maQuyen];
      const desc = newDescriptions[maQuyen];

      // Primary role = first in group
      const primaryRole = roles[0];
      primaryIds[maQuyen] = primaryRole.id;

      // Update primary role - set unique ten_quyen = ma_quyen (để tránh conflict)
      // Dùng ma_quyen làm ten_quyen mới tạm thời, sau đó set display name
      await client.query(
        `UPDATE sys_role 
         SET ma_quyen = $1, ten_quyen = $2, mo_ta = $3, permissions = $4::jsonb, status = true
         WHERE id = $5`,
        [maQuyen, displayName, desc, JSON.stringify(perms), primaryRole.id],
      );
      console.log(
        `✅ Updated primary [${primaryRole.id}] ${primaryRole.ten_quyen} -> ${maQuyen} (${displayName})`,
      );

      // Move users từ duplicate roles về primary
      for (let i = 1; i < roles.length; i++) {
        const dupRole = roles[i];
        try {
          // Tạm thời đổi ten_quyen của duplicate role thành something unique để tránh conflict
          await client.query(
            `UPDATE sys_role SET ten_quyen = $1 WHERE id = $2`,
            [`_MERGED_${dupRole.id}`, dupRole.id],
          );
          console.log(
            `  ✓ Renamed duplicate [${dupRole.id}] ${dupRole.ten_quyen} -> _MERGED_${dupRole.id}`,
          );
        } catch (e) {
          console.log(`  ⚠️ Could not rename [${dupRole.id}]: ${e.message}`);
        }
      }
    }

    // Create missing roles nếu chưa có
    for (const maQuyen of ["ADMIN", "BAN_HANG", "KHO", "KE_TOAN", "QUAN_LY"]) {
      if (!primaryIds[maQuyen]) {
        const result = await client.query(
          `INSERT INTO sys_role (ma_quyen, ten_quyen, mo_ta, permissions, status)
           VALUES ($1, $2, $3, $4::jsonb, true) RETURNING id`,
          [
            maQuyen,
            newDisplayNames[maQuyen],
            newDescriptions[maQuyen],
            JSON.stringify(permissionsMap[maQuyen]),
          ],
        );
        primaryIds[maQuyen] = result.rows[0].id;
        console.log(
          `✅ Created new role: ${maQuyen} (ID=${result.rows[0].id})`,
        );
      }
    }

    await client.query("COMMIT");
    console.log("\n✅ COMMIT successful!\n");

    // Verify
    const finalRoles = await pool.query(
      "SELECT id, ma_quyen, ten_quyen, (permissions IS NOT NULL) as has_perm FROM sys_role ORDER BY id",
    );
    console.log("📋 Final roles:");
    finalRoles.rows.forEach((r) => {
      console.log(
        `  [${r.id}] ${r.ma_quyen || "NULL"} | ${r.ten_quyen} | perm=${r.has_perm}`,
      );
    });

    // Show permissions summary
    console.log("\n📝 Permissions summary:");
    for (const maQuyen of ["ADMIN", "BAN_HANG", "KHO", "KE_TOAN", "QUAN_LY"]) {
      const p = permissionsMap[maQuyen];
      console.log(`\n  ${maQuyen}:`);
      Object.entries(p).forEach(([mod, actions]) => {
        const allowed = Object.entries(actions)
          .filter(([, v]) => v)
          .map(([k]) => k);
        if (allowed.length > 0)
          console.log(`    ${mod}: ${allowed.join(", ")}`);
      });
    }

    console.log("\n✅ DONE!\n");
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (e) {}
    console.error("❌ Error:", err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

applyPermissions().catch((err) => {
  process.exit(1);
});
