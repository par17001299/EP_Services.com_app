const XLSX = require("xlsx");

module.exports = function readExcel(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    // -----------------------------------------
    // 1. Extract Divisions, Departments, Roles
    // -----------------------------------------
    const divisions = data[0].slice(1).map(x => String(x).trim());
    const departments = data[1].slice(1).map(x => String(x).trim());
    const roles = data[2].slice(1).map(x => String(x).trim());

    // Build roleKey map
    const roleKeys = {};
    roles.forEach(role => {
        roleKeys[role] = role.toLowerCase().replace(/\s+/g, "_");
    });

    // -----------------------------------------
    // 2. Build permissions object
    // -----------------------------------------
    const permissions = {};

    for (let i = 3; i < data.length; i++) {
        const row = data[i];
        const pageName = String(row[0]).trim();
        if (!pageName) continue;

        permissions[pageName] = {};

        for (let col = 1; col < row.length; col++) {
            const role = roles[col - 1];
            const perm = row[col] || "N_A";
            permissions[pageName][role] = perm;
        }
    }

    // -----------------------------------------
    // 3. Build department → roles mapping
    // -----------------------------------------
    const deptRoleMap = {};
    departments.forEach((dept, idx) => {
        if (!deptRoleMap[dept]) deptRoleMap[dept] = [];
        const role = roles[idx];
        if (role) deptRoleMap[dept].push(role);
    });

    // -----------------------------------------
    // 4. Build division → departments mapping
    // -----------------------------------------
    const divDeptMap = {};
    divisions.forEach((div, idx) => {
        if (!divDeptMap[div]) divDeptMap[div] = [];
        const dept = departments[idx];
        if (dept) divDeptMap[div].push(dept);
    });

    return {
        divisions,
        departments: divDeptMap,
        roles: deptRoleMap,
        roleKeys,
        permissions
    };
};
