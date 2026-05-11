// public/js/user-edit.js

function getUserIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

async function loadUser(id) {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error("Failed to load user");
    return await res.json();
}

function renderForm(user) {
    return `
        <h1>Edit User</h1>

        <form id="editUserForm">

            <label>Name</label>
            <input type="text" id="name" value="${user.name || ""}" required>

            <label>Email</label>
            <input type="email" id="email" value="${user.email || ""}" required>

            <label>Division</label>
            <input type="text" id="division" value="${user.division || ""}" required>

            <label>Department</label>
            <input type="text" id="department" value="${user.department || ""}" required>

            <label>Role</label>
            <input type="text" id="role" value="${user.role || ""}" required>

            <label>Role Key</label>
            <input type="text" id="roleKey" value="${user.role_key || ""}" required>

            <label>New Password (optional)</label>
            <input type="password" id="newPassword" placeholder="Leave blank to keep current password">

            <div class="form-actions">
                <button type="submit">Save Changes</button>
                <button type="button" onclick="goBack()">Cancel</button>
            </div>

        </form>
    `;
}

async function updateUser(id) {
    const body = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        division: document.getElementById("division").value,
        department: document.getElementById("department").value,
        role: document.getElementById("role").value,
        roleKey: document.getElementById("roleKey").value
    };

    await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
}

async function updatePassword(id, newPassword) {
    await fetch(`/api/users/${id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword })
    });
}

function goBack() {
    window.location.href = "/pages/user-list.html";
}

async function init() {
    const app = document.getElementById("app");
    const id = getUserIdFromUrl();

    if (!id) {
        app.innerHTML = "<p>Missing user ID.</p>";
        return;
    }

    app.innerHTML = "<p>Loading user...</p>";

    try {
        const user = await loadUser(id);
        app.innerHTML = renderForm(user);

        document
            .getElementById("editUserForm")
            .addEventListener("submit", async (e) => {
                e.preventDefault();

                await updateUser(id);

                const newPassword = document
                    .getElementById("newPassword")
                    .value.trim();

                if (newPassword !== "") {
                    if (newPassword.length < 6) {
                        alert("Password must be at least 6 characters");
                        return;
                    }
                    await updatePassword(id, newPassword);
                }

                alert("User updated successfully");
                goBack();
            });
    } catch (err) {
        console.error(err);
        app.innerHTML = "<p>Failed to load user.</p>";
    }
}

window.goBack = goBack;

init();
