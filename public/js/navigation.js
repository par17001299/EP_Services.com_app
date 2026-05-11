// navigation.js
// Requires: session.js + rbac.generated.js loaded BEFORE this file

(function () {
    const user = getCurrentUser();
    if (!user) return;

    const RBAC = window.RBAC_MAP;

    // List of pages to show in navigation
    const NAV_ITEMS = [
        { name: "Dashboard", page: "dashboard" },
        { name: "Create User", page: "user-create" },
        { name: "User List", page: "user-list" },
        { name: "Settings", page: "settings" }
    ];

    // Build nav container
    const nav = document.createElement("nav");
    nav.innerHTML = `
        <div class="nav-container">
            <div class="nav-title">EP Systems</div>
            <div class="nav-links"></div>
        </div>
    `;

    const linksContainer = nav.querySelector(".nav-links");

    // Add links based on RBAC permissions
    NAV_ITEMS.forEach(item => {
        const perm = RBAC.permissions[item.page]?.[user.role];

        if (perm && perm !== "N_A") {
            const link = document.createElement("a");
            link.href = `/pages/${item.page}.html`;
            link.textContent = item.name;
            linksContainer.appendChild(link);
        }
    });

    // Add logout button
    const logoutBtn = document.createElement("a");
    logoutBtn.textContent = "Logout";
    logoutBtn.style.cursor = "pointer";
    logoutBtn.onclick = logout;
    linksContainer.appendChild(logoutBtn);

    // Inject into DOM
    document.body.prepend(nav);
})();
