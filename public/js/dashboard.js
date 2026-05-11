// dashboard.js

(function () {
    const app = document.getElementById("app");
    const user = getCurrentUser();

    app.innerHTML = `
        <div class="topbar">
            <div class="brand">EP Systems</div>
            <div class="user-info">
                <span>${user.name} (${user.role})</span>
                <button id="logoutBtn">Logout</button>
            </div>
        </div>

        <div class="dashboard-container">

            <div class="dashboard-grid">

                <!-- Card 1 -->
                <div class="dash-card">
                    <h2>Quick Actions</h2>
                    <div class="actions">
                        <button onclick="window.location.href='/pages/user-create.html'">Create User</button>
                        <button onclick="window.location.href='/pages/user-list.html'">User List</button>
                    </div>
                </div>

                <!-- Card 2 -->
                <div class="dash-card">
                    <h2>System Overview</h2>
                    <ul class="overview-list">
                        <li><strong>Division:</strong> ${user.division}</li>
                        <li><strong>Department:</strong> ${user.department}</li>
                        <li><strong>Role:</strong> ${user.role}</li>
                    </ul>
                </div>

                <!-- Card 3 -->
                <div class="dash-card wide">
                    <h2>Recent Activity</h2>
                    <div class="placeholder">Activity feed coming soon…</div>
                </div>

            </div>

        </div>
    `;

    document.getElementById("logoutBtn").addEventListener("click", logout);
})();
