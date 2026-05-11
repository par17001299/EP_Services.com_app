// login.js

(function () {
    const app = document.getElementById("app");

    app.innerHTML = `
        <div class="auth-card">
            <h1>Sign in</h1>
            <form id="loginForm">
                <label>Email</label>
                <input type="email" id="email" required>

                <label>Password</label>
                <input type="password" id="password" required>

                <button type="submit">Login</button>
            </form>
            <div id="loginError" class="error" style="display:none;"></div>
        </div>
    `;

    const form = document.getElementById("loginForm");
    const errorBox = document.getElementById("loginError");

    // 🔧 Stub: replace with real backend call
    async function authenticate(email, password) {
        // Example hard-coded users for now
        const fakeUsers = [
            {
                id: 1,
                name: "CEO User",
                email: "ceo@example.com",
                role: "CEO",
                division: "Management",
                department: "Management"
            },
            {
                id: 2,
                name: "Reception Apprentice",
                email: "reception.apprentice@example.com",
                role: "Apprentice",
                division: "Operations",
                department: "Receptionists"
            }
        ];

        const user = fakeUsers.find(u => u.email === email);
        if (!user) return null;

        // TODO: validate password via backend
        return user;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorBox.style.display = "none";
        errorBox.textContent = "";

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const user = await authenticate(email, password);

        if (!user) {
            errorBox.textContent = "Invalid email or password.";
            errorBox.style.display = "block";
            return;
        }

        // Store session
        localStorage.setItem("currentUser", JSON.stringify(user));

        // Redirect to your main entry page
        window.location.href = "/pages/dashboard.html";
    });
})();
