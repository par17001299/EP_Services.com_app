// rbac.guard.js
// Requires rbac.generated.js loaded BEFORE this file

(function () {
    if (!window.RBAC_MAP) {
        console.error("RBAC_MAP missing — cannot enforce RBAC.");
        return;
    }

    const RBAC = window.RBAC_MAP;

    // -----------------------------------------
    // 1. Get current user
    // -----------------------------------------
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

    if (!currentUser) {
        console.warn("No user logged in — redirecting to login.");
        window.location.href = "/pages/login.html";
        return;
    }

    const userRole = currentUser.role;
    if (!userRole) {
        console.error("User has no role — blocking access.");
        document.body.innerHTML = "<h1>Access Denied</h1>";
        return;
    }

    // -----------------------------------------
    // 2. Determine current page name
    // -----------------------------------------
    const path = window.location.pathname;
    const pageName = path.split("/").pop().replace(".html", "");

    // Example: "user-create.html" → "user-create"
    // Your Excel uses page names EXACTLY as column A

    if (!RBAC.permissions[pageName]) {
        console.warn(`No RBAC entry for page '${pageName}'. Allowing access by default.`);
        return;
    }

    // -----------------------------------------
    // 3. Get permission for this role
    // -----------------------------------------
    const perm = RBAC.permissions[pageName][userRole] || "N_A";

    // -----------------------------------------
    // 4. Enforce rules
    // -----------------------------------------
    if (perm === "N_A") {
        document.body.innerHTML = `
            <h1>Access Denied</h1>
            <p>Your role (${userRole}) does not have access to this page.</p>
        `;
        return;
    }

    if (perm === "R") {
        console.log(`RBAC: ${userRole} has READ access to ${pageName}`);
        return;
    }

    if (perm === "R_W") {
        console.log(`RBAC: ${userRole} has READ/WRITE access to ${pageName}`);
        return;
    }

    if (perm === "R") {
        document.querySelectorAll("input, select, textarea, button").forEach(el => {
            el.disabled = true;
    });
    }

})();
