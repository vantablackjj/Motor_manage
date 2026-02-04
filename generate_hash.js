const bcrypt = require("bcryptjs");
const password = process.argv[2] || "admin123456";
bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(hash);
});
