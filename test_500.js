require("dotenv").config();
const BrandService = require("./src/services/brands.service");
const PhuTungService = require("./src/services/phuTung.service");

async function test() {
  try {
    console.log("Testing BrandService.getAll({ma_nhom_cha: 'PT'})...");
    const brands = await BrandService.getAll({ ma_nhom_cha: "PT" });
    console.log("Success! Brands count:", brands.length);

    console.log("Testing PhuTungService.getAll({search: ''})...");
    const parts = await PhuTungService.getAll({ search: "" });
    console.log("Success! Parts count:", parts.length);
  } catch (err) {
    console.error("ERROR DETECTED:");
    console.error(err);
  }
}

test();
