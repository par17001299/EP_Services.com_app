// public/js/user-list.js

console.log("🔥 user-list.js loaded");

let allUsers = [];

// -------------------------------
// Load all users
// -------------------------------
async function loadUsers() {
    try {
        const res = await fetch('/api/users');
        return await res.json();
    } catch (err) {
        console.error(err);
        return [];
    }
}

// -------------------------------
// Render table
// -------------------------------
function renderTable(users) {
    const rows = users.map(u => `
        <tr>
            <td>${u.id}</td>
            <td>${u.name}</td>
            <td>${u.emp_no}</td>
            <td>${u.email}</td>
            <td>${u.division}</td>
            <td>${u.department}</td>
            <td>${u.role}</td>
            <td>${u.role_key}</td>
            <td>${u.created_by}</td>

            <td>
                <span class="badge ${u.active ? "badge-active" : "badge-inactive"}">
                    ${u.active ? "Active" : "Inactive"}
                </span>
                ${u.locked ? '<span class="badge badge-locked">Locked</span>' : ''}
            </td>

            <td>
                ${u.must_reset_password ? '<span class="badge badge-warning">Must reset</span>' : ''}
            </td>

            <td class="actions-cell">
                <div class="dropdown">
                    <button class="dropdown-btn" type="button" onclick="toggleRowDropdown(event, this)">
                        Actions ▼
                    </button>
                    <div class="dropdown-menu">
                        <div onclick="editUser(${u.id})">Edit User</div>
                        <div onclick="resetPassword(${u.id})">Reset Password</div>
                        <div onclick="forceReset(${u.id})">Force Reset</div>
                        <div onclick="toggleLock(${u.id})">${u.locked ? "Unlock Account" : "Lock Account"}</div>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');

    return `
        <table class="user-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Employee #</th>
                    <th>Email</th>
                    <th>Division</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Role Key</th>
                    <th>Created By</th>
                    <th>Status</th>
                    <th>Reset Flag</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

// -------------------------------
// Search + Filtering
// -------------------------------
function applyFilters(users) {
    const search = document.getElementById("search").value.toLowerCase();
    const createdByFilter = document.getElementById("createdByFilter").value;

    return users.filter(u => {
        const matchesSearch =
            u.name.toLowerCase().includes(search) ||
            u.email.toLowerCase().includes(search) ||
            (u.emp_no || '').toLowerCase().includes(search);

        const matchesCreator =
            createdByFilter === "all" || u.created_by === createdByFilter;

        return matchesSearch && matchesCreator;
    });
}

// -------------------------------
// Navigation to Create User
// -------------------------------
function goToCreateUser() {
    window.location.href = "/pages/user-create.html";
}

// -------------------------------
// Toggle Active
// -------------------------------
async function toggleActive(id) {
    await fetch(`/api/users/${id}/activate`, { method: "PATCH" });
    init();
}

// -------------------------------
// Edit User
// -------------------------------
function editUser(id) {
    window.location.href = `/pages/user-edit.html?id=${id}`;
}

// -------------------------------
// Reset Password
// -------------------------------
async function resetPassword(id) {
    const newPassword = prompt("Enter a new password for this user:");

    if (!newPassword || newPassword.trim() === "") return alert("Cancelled");
    if (newPassword.length < 6) return alert("Password must be at least 6 characters");

    await fetch(`/api/users/${id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword })
    });

    alert("Password updated");
    init();
}

// -------------------------------
// Force password reset on next login
// -------------------------------
async function forceReset(id) {
    if (!confirm("Force password reset?")) return;

    await fetch(`/api/users/${id}/force-reset`, { method: "PATCH" });

    alert("User will be forced to reset password");
    init();
}

// -------------------------------
// Toggle account lock
// -------------------------------
async function toggleLock(id) {
    if (!confirm("Toggle lock state?")) return;

    await fetch(`/api/users/${id}/lock-toggle`, { method: "PATCH" });

    alert("Lock state updated");
    init();
}

// -------------------------------
// Initialise Page
// -------------------------------
async function init() {
    const app = document.getElementById("app");
    app.innerHTML = `<h1>User List</h1><p>Loading...</p>`;

    allUsers = await loadUsers();

    const uniqueCreators = [...new Set(allUsers.map(u => u.created_by))];

    app.innerHTML = `
        <h1>User List</h1>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <div class="filters">
                <input id="search" placeholder="Search users...">
                
                <select id="createdByFilter">
                    <option value="all">Created by (All)</option>
                    ${uniqueCreators.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
            </div>

            <button class="create-user-btn" onclick="goToCreateUser()">+ Create User</button>
        </div>

        <div id="tableContainer"></div>
    `;

    document.getElementById("search").addEventListener("input", updateTable);
    document.getElementById("createdByFilter").addEventListener("change", updateTable);

    updateTable();
}

function updateTable() {
    const filtered = applyFilters(allUsers);
    document.getElementById("tableContainer").innerHTML = renderTable(filtered);
}

// -------------------------------
// Dropdown handler (FINAL FIXED VERSION)
// -------------------------------
function toggleRowDropdown(event, btn) {
    event.stopPropagation(); // prevents immediate close

    const dropdown = btn.closest(".dropdown");

    // Close all others
    document.querySelectorAll(".dropdown").forEach(dd => {
        if (dd !== dropdown) dd.classList.remove("show");
    });

    dropdown.classList.toggle("show");
}

// Close dropdowns when clicking outside
document.addEventListener("click", function (e) {
    if (!e.target.closest(".dropdown")) {
        document.querySelectorAll(".dropdown").forEach(dd => dd.classList.remove("show"));
    }
});

// Expose globally for inline onclick
window.toggleRowDropdown = toggleRowDropdown;

// Expose other functions globally
window.toggleActive = toggleActive;
window.editUser = editUser;
window.resetPassword = resetPassword;
window.forceReset = forceReset;
window.toggleLock = toggleLock;
window.goToCreateUser = goToCreateUser;

init();
