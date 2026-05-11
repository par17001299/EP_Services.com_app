// app.js
import { buildNavigation } from './nav.js';

buildNavigation();
loadPageFromHash();

window.addEventListener('hashchange', loadPageFromHash);

function loadPageFromHash() {
  const view = document.getElementById('view');
  const hash = location.hash.replace('#/', '');

  if (!hash) {
    view.innerHTML = `<h2>Welcome</h2>`;
    return;
  }

  fetch(`../generated/pages/${hash}.html`)
    .then(res => res.text())
    .then(html => view.innerHTML = html)
    .catch(() => {
      view.innerHTML = `<h2>Page not found</h2>`;
    });
}
