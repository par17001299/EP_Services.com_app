// user-create.js
// Requires rbac.generated.js loaded BEFORE this file

(function () {
    const RBAC = window.RBAC_MAP;
    const app = document.getElementById("app");

    // -----------------------------------------
    // Temporary password generator
    // -----------------------------------------
    function generateTempPassword() {
        const prefix = "EP-";
        const random = Math.floor(1000 + Math.random() * 9000);
        return prefix + random;
    }

    // -----------------------------------------
    // Inject full HTML UI
    // -----------------------------------------
    app.innerHTML = `
        <h1>Create User</h1>

        <form id="createUserForm" class="card">

            <label>Division</label>
            <select id="division" required></select>

            <label>Department</label>
            <select id="department" required></select>

            <label>Role</label>
            <select id="role" required></select>

            <input type="hidden" id="roleKey" name="roleKey">

            <label>Employee Number</label>
            <input type="text" id="empNo" required>

            <label>Full Name</label>
            <input type="text" id="name" required>

            <label>Email</label>
            <input type="email" id="email" required>

            <label>Temporary Password</label>
            <input type="text" id="tempPassword" readonly>


            <div class="strength-meter">
                <div class="strength-bar" id="strengthBar"></div>
            </div>
            <div class="strength-text" id="strengthText">Strength: Weak</div>
            <div class="form-actions">
                <button type="submit">Create User</button>
            </div>
        </form>
    `;

    // -----------------------------------------
    // Cache elements
    // -----------------------------------------
    const divisionSelect = document.getElementById("division");
    const departmentSelect = document.getElementById("department");
    const roleSelect = document.getElementById("role");
    const roleKeyInput = document.getElementById("roleKey");
    const tempPasswordInput = document.getElementById("tempPassword");

    // -----------------------------------------
    // Helpers
    // -----------------------------------------
    function clearSelect(select, placeholder) {
        select.innerHTML = `<option value="">${placeholder}</option>`;
    }

    // -----------------------------------------
    // Load Divisions
    // -----------------------------------------
    function loadDivisions() {
        clearSelect(divisionSelect, "Select Division");
        clearSelect(departmentSelect, "Select Department");
        clearSelect(roleSelect, "Select Role");

        Object.keys(RBAC.departments).forEach(div => {
            divisionSelect.innerHTML += `<option value="${div}">${div}</option>`;
        });
    }

    // -----------------------------------------
    // Load Departments
    // -----------------------------------------
    function loadDepartments(division) {
        clearSelect(departmentSelect, "Select Department");
        clearSelect(roleSelect, "Select Role");

        if (!division) return;

        RBAC.departments[division].forEach(dept => {
            departmentSelect.innerHTML += `<option value="${dept}">${dept}</option>`;
        });
    }

    // -----------------------------------------
    // Load Roles
    // -----------------------------------------
    function loadRoles(department) {
        clearSelect(roleSelect, "Select Role");

        if (!department) return;

        RBAC.roles[department].forEach(role => {
            roleSelect.innerHTML += `<option value="${role}">${role}</option>`;
        });
    }
function updateStrengthMeter(password) {
    const bar = document.getElementById("strengthBar");
    const text = document.getElementById("strengthText");

    const score = evaluatePasswordStrength(password);

    let width = (score / 5) * 100;
    let color = "#ff4d4d";
    let label = "Very Weak";

    if (score === 2) { color = "#ff884d"; label = "Weak"; }
    if (score === 3) { color = "#ffcc00"; label = "Medium"; }
    if (score === 4) { color = "#66cc66"; label = "Strong"; }
    if (score === 5) { color = "#28c76f"; label = "Very Strong"; }

    bar.style.width = width + "%";
    bar.style.background = color;
    text.textContent = "Strength: " + label;
}
const tempPasswordInput = document.getElementById("tempPassword");

tempPasswordInput.addEventListener("input", () => {
    updateStrengthMeter(tempPasswordInput.value);
});

    // -----------------------------------------
    // Update Role Key
    // -----------------------------------------
    function updateRoleKey(role) {
        roleKeyInput.value = RBAC.roleKeys[role] || "";
    }

    // -----------------------------------------
    // Event Listeners
    // -----------------------------------------
    divisionSelect.addEventListener("change", e => {
        loadDepartments(e.target.value);
        updateRoleKey("");
    });

    departmentSelect.addEventListener("change", e => {
        loadRoles(e.target.value);
        updateRoleKey("");
    });

    roleSelect.addEventListener("change", e => {
        updateRoleKey(e.target.value);
    });

    // -----------------------------------------
    // Init
    // -----------------------------------------
    loadDivisions();
    tempPasswordInput.value = generateTempPassword();
})();
