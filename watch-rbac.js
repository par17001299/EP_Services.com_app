const fs = require("fs");
const path = require("path");
const buildRBAC = require("./rbac-builder");

const RBAC_FILE = path.join(__dirname, "Access_matrix_FIXED.xlsx");

console.log("🔍 Watching RBAC Excel file for changes...");
console.log("📁 File:", RBAC_FILE);

function runBuild() {
    console.log("⚙️ Rebuilding RBAC...");
    try {
        buildRBAC();
        console.log("✅ RBAC regenerated");
    } catch (err) {
        console.error("❌ RBAC build failed:", err);
    }
}

runBuild();

fs.watchFile(RBAC_FILE, { interval: 1000 }, (curr, prev) => {
    if (curr.mtime !== prev.mtime) {
        console.log("📄 RBAC Excel changed — regenerating...");
        runBuild();
    }
});
