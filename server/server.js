// server/server.js

const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

// -------------------------------
// Database Connection
// -------------------------------
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'ST4rwars_04',
    database: 'ep_platform'
});

// -------------------------------
// Constants
// -------------------------------
const MAX_FAILED_ATTEMPTS = 5;
const PASSWORD_HISTORY_LIMIT = 5;

// -------------------------------
// Audit Logging Helper
// -------------------------------
async function logAction({ userId = null, adminId = null, action, details = null, ip }) {
    try {
        await pool.query(
            `INSERT INTO audit_log (user_id, admin_id, action, details, ip_address)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, adminId, action, details, ip]
        );
    } catch (err) {
        console.error("logAction error:", err);
    }
}

// -------------------------------
// Static Files
// -------------------------------
app.use(express.static(path.join(__dirname, '..', 'public')));

// =====================================================================
// USERS CORE
// =====================================================================

// GET all users
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM users ORDER BY id ASC");
        res.json(rows);
    } catch (err) {
        console.error("GET /api/users error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// GET single user
app.get('/api/users/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
        if (!rows.length) return res.status(404).json({ error: "User not found" });
        res.json(rows[0]);
    } catch (err) {
        console.error("GET /api/users/:id error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// CREATE user
app.post('/api/users', async (req, res) => {
    const { name, empNo, email, division, department, role, roleKey, password, createdBy } = req.body;

    try {
        const passwordHash = await bcrypt.hash(password, 10);

        await pool.query(
            `INSERT INTO users 
            (name, emp_no, email, division, department, role, role_key, password_hash, created_by, active, must_reset_password, failed_attempts, locked)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, 0)`,
            [name, empNo, email, division, department, role, roleKey, passwordHash, createdBy]
        );

        await logAction({
            userId: null,
            adminId: createdBy || null,
            action: "USER_CREATED",
            details: email,
            ip: req.ip
        });

        res.json({ success: true });
    } catch (err) {
        console.error("POST /api/users error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// EDIT user (non-password fields)
app.patch('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, division, department, role, roleKey, adminId } = req.body;

    try {
        await pool.query(
            `UPDATE users 
             SET name=?, email=?, division=?, department=?, role=?, role_key=?
             WHERE id=?`,
            [name, email, division, department, role, roleKey, id]
        );

        await logAction({
            userId: id,
            adminId: adminId || null,
            action: "USER_EDIT",
            details: JSON.stringify({ name, email, division, department, role, roleKey }),
            ip: req.ip
        });

        res.json({ success: true });
    } catch (err) {
        console.error("PATCH /api/users/:id error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// TOGGLE active/inactive
app.patch('/api/users/:id/activate', async (req, res) => {
    const { id } = req.params;
    const { adminId } = req.body;

    try{
        await pool.query("UPDATE users SET active = NOT active WHERE id = ?", [id]);

        await logAction({
            userId: id,
            adminId: adminId || null,
            action: "TOGGLE_ACTIVE",
            ip: req.ip
        });

        res.json({ success: true });
    } catch (err) {
        console.error("PATCH /api/users/:id/activate error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// =====================================================================
// PASSWORD + HISTORY + FORCE RESET
// =====================================================================

// UPDATE PASSWORD with history enforcement
app.patch('/api/users/:id/password', async (req, res) => {
    const { id } = req.params;
    const { newPassword, adminId } = req.body;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    try {
        const newHash = await bcrypt.hash(newPassword, 10);

        // Check against last N passwords
        const [history] = await pool.query(
            "SELECT password_hash FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
            [id, PASSWORD_HISTORY_LIMIT]
        );

        for (const row of history) {
            const same = await bcrypt.compare(newPassword, row.password_hash);
            if (same) {
                return res.status(400).json({ error: "Cannot reuse recent password" });
            }
        }

        // Get current hash to store in history
        const [currentRows] = await pool.query(
            "SELECT password_hash FROM users WHERE id = ?",
            [id]
        );
        const currentHash = currentRows.length ? currentRows[0].password_hash : null;

        // Update user password
        await pool.query(
            "UPDATE users SET password_hash = ?, must_reset_password = 0, failed_attempts = 0, locked = 0 WHERE id = ?",
            [newHash, id]
        );

        // Insert old hash into history (if exists)
        if (currentHash) {
            await pool.query(
                "INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)",
                [id, currentHash]
            );
        }

        await logAction({
            userId: id,
            adminId: adminId || null,
            action: "PASSWORD_RESET_WITH_HISTORY",
            ip: req.ip
        });

        res.json({ success: true });
    } catch (err) {
        console.error("PATCH /api/users/:id/password error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// FORCE PASSWORD RESET ON NEXT LOGIN
app.patch('/api/users/:id/force-reset', async (req, res) => {
    const { id } = req.params;
    const { adminId } = req.body;

    try {
        await pool.query(
            "UPDATE users SET must_reset_password = 1 WHERE id = ?",
            [id]
        );

        await logAction({
            userId: id,
            adminId: adminId || null,
            action: "FORCE_PASSWORD_RESET_FLAG_SET",
            ip: req.ip
        });

        res.json({ success: true });
    } catch (err) {
        console.error("PATCH /api/users/:id/force-reset error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// =====================================================================
// ACCOUNT LOCKING + LOGIN
// =====================================================================

// MANUAL LOCK / UNLOCK
app.patch('/api/users/:id/lock-toggle', async (req, res) => {
    const { id } = req.params;
    const { adminId } = req.body;

    try {
        const [rows] = await pool.query("SELECT locked FROM users WHERE id = ?", [id]);
        if (!rows.length) return res.status(404).json({ error: "User not found" });

        const locked = rows[0].locked === 1;

        if (locked) {
            await pool.query("UPDATE users SET locked = 0, failed_attempts = 0 WHERE id = ?", [id]);
        } else {
            await pool.query("UPDATE users SET locked = 1 WHERE id = ?", [id]);
        }

        await logAction({
            userId: id,
            adminId: adminId || null,
            action: locked ? "ACCOUNT_UNLOCKED_MANUAL" : "ACCOUNT_LOCKED_MANUAL",
            ip: req.ip
        });

        res.json({ success: true });
    } catch (err) {
        console.error("PATCH /api/users/:id/lock-toggle error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// LOGIN with auto-lock + force reset
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await pool.query(
            "SELECT * FROM users WHERE email = ? AND active = 1",
            [email]
        );

        if (!rows.length) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const user = rows[0];

        if (user.locked) {
            return res.status(423).json({ error: "Account locked. Contact an administrator." });
        }

        const ok = await bcrypt.compare(password, user.password_hash);

        if (!ok) {
            const newAttempts = (user.failed_attempts || 0) + 1;
            const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;

            await pool.query(
                "UPDATE users SET failed_attempts = ?, locked = ? WHERE id = ?",
                [newAttempts, shouldLock ? 1 : 0, user.id]
            );

            await logAction({
                userId: user.id,
                action: shouldLock ? "ACCOUNT_LOCKED_AUTO" : "LOGIN_FAILED",
                details: `Attempts: ${newAttempts}`,
                ip: req.ip
            });

            if (shouldLock) {
                return res.status(423).json({ error: "Account locked due to too many failed attempts." });
            }

            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Successful login
        await pool.query("UPDATE users SET failed_attempts = 0 WHERE id = ?", [user.id]);

        await logAction({
            userId: user.id,
            action: "LOGIN_SUCCESS",
            ip: req.ip
        });

        if (user.must_reset_password) {
            return res.json({
                forcePasswordReset: true,
                userId: user.id
            });
        }

        // Here you would normally create a session token and store it in `sessions`
        // For now, just return success + userId
        res.json({ success: true, userId: user.id });
    } catch (err) {
        console.error("POST /api/login error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// =====================================================================
// TOTP (Two-Factor) SKELETON
// =====================================================================

// Start TOTP setup (generate secret)
app.post('/api/users/:id/totp/setup', async (req, res) => {
    const { id } = req.params;
    const { adminId } = req.body;

    try {
        const secret = crypto.randomBytes(20).toString('hex');

        await pool.query(
            "UPDATE users SET totp_secret = ? WHERE id = ?",
            [secret, id]
        );

        await logAction({
            userId: id,
            adminId: adminId || null,
            action: "TOTP_SETUP_STARTED",
            ip: req.ip
        });

        res.json({ secret });
    } catch (err) {
        console.error("POST /api/users/:id/totp/setup error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Enable TOTP (after verification)
app.post('/api/users/:id/totp/enable', async (req, res) => {
    const { id } = req.params;
    const { verified, adminId } = req.body;

    if (!verified) {
        return res.status(400).json({ error: "TOTP verification failed" });
    }

    try {
        await pool.query(
            "UPDATE users SET totp_enabled = 1 WHERE id = ?",
            [id]
        );

        await logAction({
            userId: id,
            adminId: adminId || null,
            action: "TOTP_ENABLED",
            ip: req.ip
        });

        res.json({ success: true });
    } catch (err) {
        console.error("POST /api/users/:id/totp/enable error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Disable TOTP
app.patch('/api/users/:id/totp/disable', async (req, res) => {
    const { id } = req.params;
    const { adminId } = req.body;

    try {
        await pool.query(
            "UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?",
            [id]
        );

        await logAction({
            userId: id,
            adminId: adminId || null,
            action: "TOTP_DISABLED",
            ip: req.ip
        });

        res.json({ success: true });
    } catch (err) {
        console.error("PATCH /api/users/:id/totp/disable error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// TOTP login step (placeholder verification)
app.post('/api/login/totp', async (req, res) => {
    const { userId, code } = req.body;

    try {
        const [rows] = await pool.query(
            "SELECT totp_secret, totp_enabled FROM users WHERE id = ?",
            [userId]
        );

        if (!rows.length || !rows[0].totp_enabled) {
            return res.status(400).json({ error: "TOTP not enabled" });
        }

        const secret = rows[0].totp_secret;

        // TODO: verify `code` against `secret` using a TOTP library
        const isValid = true; // placeholder

        if (!isValid) {
            await logAction({
                userId,
                action: "TOTP_FAILED",
                ip: req.ip
            });
            return res.status(401).json({ error: "Invalid TOTP code" });
        }

        await logAction({
            userId,
            action: "TOTP_SUCCESS",
            ip: req.ip
        });

        res.json({ success: true });
    } catch (err) {
        console.error("POST /api/login/totp error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// =====================================================================
// SESSIONS (FORCE LOGOUT)
// =====================================================================

// List sessions
app.get('/api/sessions', async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM sessions ORDER BY created_at DESC LIMIT 500"
        );
        res.json(rows);
    } catch (err) {
        console.error("GET /api/sessions error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Invalidate one session
app.delete('/api/sessions/:id', async (req, res) => {
    const { id } = req.params;
    const { adminId } = req.body;

    try {
        const [rows] = await pool.query("SELECT * FROM sessions WHERE id = ?", [id]);
        if (!rows.length) return res.status(404).json({ error: "Session not found" });

        await pool.query("DELETE FROM sessions WHERE id = ?", [id]);

        await logAction({
            userId: rows[0].user_id,
            adminId: adminId || null,
            action: "SESSION_INVALIDATED",
            details: `session_id=${id}`,
            ip: req.ip
        });

        res.json({ success: true });
    } catch (err) {
        console.error("DELETE /api/sessions/:id error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Invalidate all sessions for a user
app.delete('/api/users/:id/sessions', async (req, res) => {
    const { id } = req.params;
    const { adminId } = req.body;

    try {
        await pool.query("DELETE FROM sessions WHERE user_id = ?", [id]);

        await logAction({
            userId: id,
            adminId: adminId || null,
            action: "ALL_SESSIONS_INVALIDATED",
            ip: req.ip
        });

        res.json({ success: true });
    } catch (err) {
        console.error("DELETE /api/users/:id/sessions error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// =====================================================================
// BULK USER ACTIONS
// =====================================================================

app.post('/api/users/bulk', async (req, res) => {
    const { action, userIds, adminId } = req.body;

    if (!Array.isArray(userIds) || !userIds.length) {
        return res.status(400).json({ error: "No user IDs provided" });
    }

    const ids = userIds.map(id => parseInt(id, 10)).filter(Boolean);
    if (!ids.length) return res.status(400).json({ error: "Invalid user IDs" });

    const placeholders = ids.map(() => '?').join(',');

    try {
        switch (action) {
            case 'activate':
                await pool.query(`UPDATE users SET active = 1 WHERE id IN (${placeholders})`, ids);
                break;
            case 'deactivate':
                await pool.query(`UPDATE users SET active = 0 WHERE id IN (${placeholders})`, ids);
                break;
            case 'lock':
                await pool.query(`UPDATE users SET locked = 1 WHERE id IN (${placeholders})`, ids);
                break;
            case 'unlock':
                await pool.query(`UPDATE users SET locked = 0, failed_attempts = 0 WHERE id IN (${placeholders})`, ids);
                break;
            default:
                return res.status(400).json({ error: "Unknown action" });
        }

        await logAction({
            userId: null,
            adminId: adminId || null,
            action: "BULK_USER_ACTION",
            details: JSON.stringify({ action, userIds: ids }),
            ip: req.ip
        });

        res.json({ success: true });
    } catch (err) {
        console.error("POST /api/users/bulk error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// =====================================================================
// RBAC EDITOR
// =====================================================================

// Roles
app.get('/api/rbac/roles', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM roles ORDER BY id ASC");
        res.json(rows);
    } catch (err) {
        console.error("GET /api/rbac/roles error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/rbac/roles', async (req, res) => {
    const { name, key } = req.body;
    try {
        await pool.query("INSERT INTO roles (name, key_name) VALUES (?, ?)", [name, key]);
        res.json({ success: true });
    } catch (err) {
        console.error("POST /api/rbac/roles error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.patch('/api/rbac/roles/:id', async (req, res) => {
    const { id } = req.params;
    const { name, key } = req.body;
    try {
        await pool.query("UPDATE roles SET name = ?, key_name = ? WHERE id = ?", [name, key, id]);
        res.json({ success: true });
    } catch (err) {
        console.error("PATCH /api/rbac/roles/:id error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.delete('/api/rbac/roles/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM role_permissions WHERE role_id = ?", [id]);
        await pool.query("DELETE FROM roles WHERE id = ?", [id]);
        res.json({ success: true });
    } catch (err) {
        console.error("DELETE /api/rbac/roles/:id error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Permissions
app.get('/api/rbac/permissions', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM permissions ORDER BY id ASC");
        res.json(rows);
    } catch (err) {
        console.error("GET /api/rbac/permissions error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/rbac/permissions', async (req, res) => {
    const { name, key } = req.body;
    try {
        await pool.query("INSERT INTO permissions (name, key_name) VALUES (?, ?)", [name, key]);
        res.json({ success: true });
    } catch (err) {
        console.error("POST /api/rbac/permissions error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.patch('/api/rbac/permissions/:id', async (req, res) => {
    const { id } = req.params;
    const { name, key } = req.body;
    try {
        await pool.query("UPDATE permissions SET name = ?, key_name = ? WHERE id = ?", [name, key, id]);
        res.json({ success: true });
    } catch (err) {
        console.error("PATCH /api/rbac/permissions/:id error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.delete('/api/rbac/permissions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM role_permissions WHERE permission_id = ?", [id]);
        await pool.query("DELETE FROM permissions WHERE id = ?", [id]);
        res.json({ success: true });
    } catch (err) {
        console.error("DELETE /api/rbac/permissions/:id error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Role-permissions
app.get('/api/rbac/role-permissions/:roleId', async (req, res) => {
    const { roleId } = req.params;
    try {
        const [rows] = await pool.query(
            `SELECT rp.permission_id, p.name, p.key_name
             FROM role_permissions rp
             JOIN permissions p ON rp.permission_id = p.id
             WHERE rp.role_id = ?`,
            [roleId]
        );
        res.json(rows);
    } catch (err) {
        console.error("GET /api/rbac/role-permissions/:roleId error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/rbac/role-permissions/:roleId', async (req, res) => {
    const { roleId } = req.params;
    const { permissionIds } = req.body;

    try {
        await pool.query("DELETE FROM role_permissions WHERE role_id = ?", [roleId]);

        if (Array.isArray(permissionIds) && permissionIds.length) {
            const values = permissionIds.map(pid => [roleId, pid]);
            await pool.query(
                "INSERT INTO role_permissions (role_id, permission_id) VALUES ?",
                [values]
            );
        }

        res.json({ success: true });
    } catch (err) {
        console.error("POST /api/rbac/role-permissions/:roleId error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// =====================================================================
// AUDIT LOG + METRICS
// =====================================================================

// Audit log with filters
app.get('/api/audit', async (req, res) => {
    const { userId, adminId, action, from, to } = req.query;

    const conditions = [];
    const params = [];

    if (userId) {
        conditions.push("user_id = ?");
        params.push(userId);
    }

    if (adminId) {
        conditions.push("admin_id = ?");
        params.push(adminId);
    }

    if (action) {
        conditions.push("action = ?");
        params.push(action);
    }

    if (from) {
        conditions.push("created_at >= ?");
        params.push(from);
    }

    if (to) {
        conditions.push("created_at <= ?");
        params.push(to);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `
        SELECT * FROM audit_log
        ${where}
        ORDER BY id DESC
        LIMIT 500
    `;

    try {
        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error("GET /api/audit error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Admin dashboard metrics
app.get('/api/admin/metrics', async (req, res) => {
    try {
        const [[{ total_users }]] = await pool.query("SELECT COUNT(*) AS total_users FROM users");
        const [[{ active_users }]] = await pool.query("SELECT COUNT(*) AS active_users FROM users WHERE active = 1");
        const [[{ locked_users }]] = await pool.query("SELECT COUNT(*) AS locked_users FROM users WHERE locked = 1");
        const [[{ must_reset }]] = await pool.query("SELECT COUNT(*) AS must_reset FROM users WHERE must_reset_password = 1");

        const [[{ logins_last_24h }]] = await pool.query(
            "SELECT COUNT(*) AS logins_last_24h FROM audit_log WHERE action = 'LOGIN_SUCCESS' AND created_at >= NOW() - INTERVAL 1 DAY"
        );

        const [[{ failed_logins_last_24h }]] = await pool.query(
            "SELECT COUNT(*) AS failed_logins_last_24h FROM audit_log WHERE action = 'LOGIN_FAILED' AND created_at >= NOW() - INTERVAL 1 DAY"
        );

        res.json({
            total_users,
            active_users,
            locked_users,
            must_reset,
            logins_last_24h,
            failed_logins_last_24h
        });
    } catch (err) {
        console.error("GET /api/admin/metrics error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// =====================================================================
// BACKUP & RESTORE
// =====================================================================

// Backup users
app.get('/api/backup/users', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM users");
        res.json(rows);
    } catch (err) {
        console.error("GET /api/backup/users error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Backup audit log
app.get('/api/backup/audit', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM audit_log");
        res.json(rows);
    } catch (err) {
        console.error("GET /api/backup/audit error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Restore users (upsert)
app.post('/api/restore/users', async (req, res) => {
    const { users } = req.body;

    if (!Array.isArray(users)) {
        return res.status(400).json({ error: "Invalid payload" });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        for (const u of users) {
            await conn.query(
                `INSERT INTO users
                (id, name, emp_no, email, division, department, role, role_key, password_hash,
                 created_by, active, must_reset_password, failed_attempts, locked, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                 name=VALUES(name), emp_no=VALUES(emp_no), email=VALUES(email),
                 division=VALUES(division), department=VALUES(department),
                 role=VALUES(role), role_key=VALUES(role_key),
                 password_hash=VALUES(password_hash),
                 created_by=VALUES(created_by),
                 active=VALUES(active),
                 must_reset_password=VALUES(must_reset_password),
                 failed_attempts=VALUES(failed_attempts),
                 locked=VALUES(locked),
                 created_at=VALUES(created_at)`,
                [
                    u.id, u.name, u.emp_no, u.email, u.division, u.department, u.role, u.role_key,
                    u.password_hash, u.created_by, u.active, u.must_reset_password,
                    u.failed_attempts, u.locked, u.created_at
                ]
            );
        }

        await conn.commit();
        res.json({ success: true });
    } catch (err) {
        await conn.rollback();
        console.error("POST /api/restore/users error:", err);
        res.status(500).json({ error: "Server error" });
    } finally {
        conn.release();
    }
});

// =====================================================================
// SERVER START
// =====================================================================

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`EP Platform API running at http://localhost:${PORT}`);
});
