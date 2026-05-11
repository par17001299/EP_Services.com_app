const fs = require("fs");
const path = require("path");
const readExcel = require("./excel-reader");

module.exports = function buildRBAC() {
    const excelPath = path.join(__dirname, "Access_matrix_FIXED.xlsx");
    const outputPath = path.join(__dirname, "public/generated/rbac.generated.js");

    console.log("📘 Reading Excel:", excelPath);

    const rbac = readExcel(excelPath);

    const jsContent = `
/* AUTO-GENERATED FILE — DO NOT EDIT */

window.RBAC_MAP = ${JSON.stringify(rbac, null, 4)};
`;

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, jsContent);

    console.log("📦 RBAC file written:", outputPath);
};
