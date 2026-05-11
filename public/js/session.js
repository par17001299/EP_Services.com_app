// session.js

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem("currentUser") || "null");
    } catch {
        return null;
    }
}

function logout() {
    localStorage.removeItem("currentUser");
    window.location.href = "/pages/login.html";
}
