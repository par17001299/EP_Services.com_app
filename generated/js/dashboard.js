import { guardPage, canWrite } from '../../public/js/rbac.runtime.js';

const PAGE = "dashboard";

if (guardPage(PAGE)) {
    const app = document.getElementById("app");

    let html = `<h1>Dashboard</h1>`;

    if (canWrite(PAGE, getCurrentRoleKey())) {
        html += `<button>Write Action</button>`;
    }

    app.innerHTML = html;
}
