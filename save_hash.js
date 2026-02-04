const bcrypt = require("bcryptjs");
const hash = bcrypt.hashSync("admin123456", 10);
const fs = require("fs");
fs.writeFileSync("hash.txt", hash);
console.log("Hash saved to hash.txt: " + hash);
