/**
 * Script kiểm tra và hiển thị permissions của từng role
 * Chạy: node check_permissions.js
 */

const { query } = require("./src/config/database");

async function checkPermissions() {
  try {
    console.log("\n========================================");
    console.log("KIỂM TRA HỆ THỐNG PHÂN QUYỀN");
    console.log("========================================\n");

    // 1. Kiểm tra các role đã tạo
    const rolesResult = await query(`
      SELECT id, ma_quyen, ten_quyen, mo_ta, status 
      FROM sys_role 
      ORDER BY id
    `);

    console.log("📋 DANH SÁCH ROLES:\n");
    rolesResult.rows.forEach((role) => {
      console.log(
        `${role.status ? "✅" : "❌"} [${role.ma_quyen}] ${role.ten_quyen}`,
      );
      console.log(`   ${role.mo_ta}`);
      console.log("");
    });

    // 2. Hiển thị chi tiết permissions của từng role
    console.log("\n========================================");
    console.log("CHI TIẾT PERMISSIONS TỪNG ROLE");
    console.log("========================================\n");

    for (const role of rolesResult.rows) {
      const permResult = await query(
        `
        SELECT permissions FROM sys_role WHERE id = $1
      `,
        [role.id],
      );

      const permissions = permResult.rows[0].permissions;

      console.log(`\n🔐 ${role.ma_quyen} - ${role.ten_quyen}`);
      console.log("─".repeat(50));

      // Hiển thị permissions theo module
      const modules = Object.keys(permissions);
      modules.forEach((module) => {
        const actions = permissions[module];
        const allowedActions = Object.keys(actions).filter(
          (action) => actions[action],
        );

        if (allowedActions.length > 0) {
          console.log(`\n  📦 ${module}:`);
          allowedActions.forEach((action) => {
            console.log(`     ✓ ${action}`);
          });
        }
      });
    }

    // 3. Kiểm tra users và roles của họ
    console.log("\n\n========================================");
    console.log("DANH SÁCH USERS VÀ ROLES");
    console.log("========================================\n");

    const usersResult = await query(`
      SELECT 
        u.id,
        u.username,
        u.ho_ten,
        u.vai_tro,
        r.ma_quyen,
        r.ten_quyen
      FROM sys_user u
      LEFT JOIN sys_role r ON u.role_id = r.id
      ORDER BY u.id
      LIMIT 20
    `);

    console.log("ID | Username | Họ tên | Vai trò | Role");
    console.log("─".repeat(80));
    usersResult.rows.forEach((user) => {
      const roleInfo = user.ma_quyen
        ? `${user.ma_quyen} (${user.ten_quyen})`
        : "CHƯA GÁN";
      console.log(
        `${user.id} | ${user.username} | ${user.ho_ten || "N/A"} | ${user.vai_tro || "N/A"} | ${roleInfo}`,
      );
    });

    // 4. Thống kê
    console.log("\n\n========================================");
    console.log("THỐNG KÊ");
    console.log("========================================\n");

    const statsResult = await query(`
      SELECT 
        r.ma_quyen,
        r.ten_quyen,
        COUNT(u.id) as so_luong_user
      FROM sys_role r
      LEFT JOIN sys_user u ON u.role_id = r.id
      GROUP BY r.id, r.ma_quyen, r.ten_quyen
      ORDER BY r.id
    `);

    console.log("Role | Tên | Số lượng users");
    console.log("─".repeat(50));
    statsResult.rows.forEach((stat) => {
      console.log(
        `${stat.ma_quyen} | ${stat.ten_quyen} | ${stat.so_luong_user} users`,
      );
    });

    // 5. Kiểm tra users chưa có role
    const noRoleResult = await query(`
      SELECT COUNT(*) as count FROM sys_user WHERE role_id IS NULL
    `);

    const noRoleCount = parseInt(noRoleResult.rows[0].count);
    if (noRoleCount > 0) {
      console.log(
        `\n⚠️  CẢNH BÁO: Có ${noRoleCount} users chưa được gán role!`,
      );

      const noRoleUsers = await query(`
        SELECT id, username, ho_ten FROM sys_user WHERE role_id IS NULL LIMIT 10
      `);

      console.log("\nDanh sách users chưa có role:");
      noRoleUsers.rows.forEach((user) => {
        console.log(`  - ${user.username} (${user.ho_ten || "N/A"})`);
      });
    } else {
      console.log("\n✅ Tất cả users đã được gán role");
    }

    console.log("\n========================================\n");
  } catch (error) {
    console.error("❌ Lỗi:", error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

// Chạy script
checkPermissions();
