// rbac.runtime.js
// Core RBAC logic used by all generated pages.
// This file is STATIC and never auto-generated.

import { RBAC_ROLES, RBAC_PAGES } from '../../generated/rbac.generated.js';

/* ---------------------------------------------------------
   Role Key Helpers
--------------------------------------------------------- */

export function getRoleKey({ department, role }) {
  if (!department || !role) return null;
  return `${department}:${role}`.replace(/\s+/g, '_');
}

export function normaliseRoleKey(key) {
  return key ? key.replace(/\s+/g, '_') : null;
}
function canRead(page, role) {
    const perm = RBAC_MAP.permissions[page][role];
    return perm === "R" || perm === "R_W";
}

function canWrite(page, role) {
    const perm = RBAC_MAP.permissions[page][role];
    return perm === "R_W";
}


/* ---------------------------------------------------------
   Permission Lookup
--------------------------------------------------------- */

export function getPermission(pageName, roleKey) {
  roleKey = normaliseRoleKey(roleKey);
  const role = RBAC_ROLES[roleKey];
  if (!role) return 'N_A';

  return role.permissions[pageName] || 'N_A';
}

export function canRead(pageName, roleKey) {
  const perm = getPermission(pageName, roleKey);
  return perm === 'R' || perm === 'R_W';
}

export function canWrite(pageName, roleKey) {
  return getPermission(pageName, roleKey) === 'R_W';
}

export function hasAnyAccess(pageName, roleKey) {
  return getPermission(pageName, roleKey) !== 'N_A';
}

/* ---------------------------------------------------------
   Page & Role Discovery
--------------------------------------------------------- */

export function listAccessiblePages(roleKey) {
  roleKey = normaliseRoleKey(roleKey);
  const role = RBAC_ROLES[roleKey];
  if (!role) return [];

  return Object.entries(role.permissions)
    .filter(([_, perm]) => perm !== 'N_A')
    .map(([page]) => page);
}

export function listWritablePages(roleKey) {
  roleKey = normaliseRoleKey(roleKey);
  const role = RBAC_ROLES[roleKey];
  if (!role) return [];

  return Object.entries(role.permissions)
    .filter(([_, perm]) => perm === 'R_W')
    .map(([page]) => page);
}

export function listRolesForPage(pageName) {
  const page = RBAC_PAGES[pageName];
  if (!page) return [];

  return Object.entries(page)
    .filter(([_, perm]) => perm !== 'N_A')
    .map(([roleKey]) => roleKey);
}

/* ---------------------------------------------------------
   Current User Helpers
--------------------------------------------------------- */

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser') || '{}');
  } catch {
    return {};
  }
}

export function getCurrentRoleKey() {
  const user = getCurrentUser();
  return normaliseRoleKey(user.roleKey);
}

/* ---------------------------------------------------------
   Page Guard (used by generated pages)
--------------------------------------------------------- */

export function guardPage(pageName) {
  const roleKey = getCurrentRoleKey();
  const container = document.getElementById('app');

  if (!roleKey || !RBAC_ROLES[roleKey]) {
    container.innerHTML = `<h2>No role assigned</h2>`;
    return false;
  }

  const perm = getPermission(pageName, roleKey);

  if (perm === 'N_A') {
    container.innerHTML = `<h2>Access Denied</h2>`;
    return false;
  }

  return true;
}
