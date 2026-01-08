require("dotenv").config();
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.join(dbDir, 'panel.db'));

// Initialize database tables
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
    );

    CREATE TABLE IF NOT EXISTS bot_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        bot_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, bot_name)
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
`);

// Create default admin user if no users exist
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount.count === 0) {
    const defaultPassword = process.env.PASSWORD || 'admin';
    const defaultUsername = process.env.USERNAME || 'admin';
    const hash = bcrypt.hashSync(defaultPassword, 10);
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(defaultUsername, hash, 'admin');
    console.log(`〚✔〛Default admin user created: ${defaultUsername}`);
}

// User functions
const UserDB = {
    // Get all users (without password hashes)
    getAll: () => {
        return db.prepare('SELECT id, username, role, created_at, last_login FROM users ORDER BY created_at DESC').all();
    },

    // Get user by ID
    getById: (id) => {
        return db.prepare('SELECT id, username, role, created_at, last_login FROM users WHERE id = ?').get(id);
    },

    // Get user by username (includes password hash for auth)
    getByUsername: (username) => {
        return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    },

    // Create new user
    create: (username, password, role = 'user') => {
        const hash = bcrypt.hashSync(password, 10);
        try {
            const result = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, hash, role);
            return { success: true, id: result.lastInsertRowid };
        } catch (err) {
            if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return { success: false, error: 'Username already exists' };
            }
            return { success: false, error: err.message };
        }
    },

    // Update user
    update: (id, updates) => {
        const allowedFields = ['username', 'role'];
        const setClauses = [];
        const values = [];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                setClauses.push(`${field} = ?`);
                values.push(updates[field]);
            }
        }

        if (updates.password) {
            setClauses.push('password_hash = ?');
            values.push(bcrypt.hashSync(updates.password, 10));
        }

        if (setClauses.length === 0) {
            return { success: false, error: 'No valid fields to update' };
        }

        values.push(id);
        try {
            db.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
            return { success: true };
        } catch (err) {
            if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return { success: false, error: 'Username already exists' };
            }
            return { success: false, error: err.message };
        }
    },

    // Delete user
    delete: (id) => {
        // Don't allow deleting the last admin
        const admins = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get();
        const user = db.prepare('SELECT role FROM users WHERE id = ?').get(id);
        
        if (user && user.role === 'admin' && admins.count <= 1) {
            return { success: false, error: 'Cannot delete the last admin user' };
        }

        db.prepare('DELETE FROM users WHERE id = ?').run(id);
        return { success: true };
    },

    // Verify password
    verifyPassword: (username, password) => {
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user) return null;
        
        if (bcrypt.compareSync(password, user.password_hash)) {
            db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
            return { id: user.id, username: user.username, role: user.role };
        }
        return null;
    },

    // Change password
    changePassword: (id, newPassword) => {
        const hash = bcrypt.hashSync(newPassword, 10);
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
        return { success: true };
    }
};

// Permission functions
const PermissionDB = {
    // Get all permissions for a user
    getByUser: (userId) => {
        return db.prepare('SELECT bot_name FROM bot_permissions WHERE user_id = ?').all(userId);
    },

    // Get all permissions (for admin view)
    getAll: () => {
        return db.prepare(`
            SELECT bp.id, bp.user_id, bp.bot_name, u.username, bp.created_at 
            FROM bot_permissions bp 
            JOIN users u ON bp.user_id = u.id 
            ORDER BY u.username, bp.bot_name
        `).all();
    },

    // Check if user has access to a bot
    hasAccess: (userId, botName) => {
        const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
        
        // Admins have access to everything
        if (user && user.role === 'admin') return true;
        
        const permission = db.prepare('SELECT id FROM bot_permissions WHERE user_id = ? AND bot_name = ?').get(userId, botName);
        return !!permission;
    },

    // Get list of bots user can access
    getAccessibleBots: (userId) => {
        const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
        
        // Admins can access all bots (return null to indicate no filtering needed)
        if (user && user.role === 'admin') return null;
        
        return db.prepare('SELECT bot_name FROM bot_permissions WHERE user_id = ?').all(userId).map(p => p.bot_name);
    },

    // Grant access to a bot
    grant: (userId, botName) => {
        try {
            db.prepare('INSERT INTO bot_permissions (user_id, bot_name) VALUES (?, ?)').run(userId, botName);
            return { success: true };
        } catch (err) {
            if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return { success: false, error: 'Permission already exists' };
            }
            return { success: false, error: err.message };
        }
    },

    // Revoke access to a bot
    revoke: (userId, botName) => {
        db.prepare('DELETE FROM bot_permissions WHERE user_id = ? AND bot_name = ?').run(userId, botName);
        return { success: true };
    },

    // Revoke all permissions for a bot (useful when deleting a bot)
    revokeAllForBot: (botName) => {
        db.prepare('DELETE FROM bot_permissions WHERE bot_name = ?').run(botName);
        return { success: true };
    },

    // Grant access to multiple bots
    grantMultiple: (userId, botNames) => {
        const insert = db.prepare('INSERT OR IGNORE INTO bot_permissions (user_id, bot_name) VALUES (?, ?)');
        const insertMany = db.transaction((bots) => {
            for (const bot of bots) {
                insert.run(userId, bot);
            }
        });
        insertMany(botNames);
        return { success: true };
    },

    // Set permissions (replace all existing)
    setPermissions: (userId, botNames) => {
        const deleteAll = db.prepare('DELETE FROM bot_permissions WHERE user_id = ?');
        const insert = db.prepare('INSERT INTO bot_permissions (user_id, bot_name) VALUES (?, ?)');
        
        const setPerms = db.transaction((bots) => {
            deleteAll.run(userId);
            for (const bot of bots) {
                insert.run(userId, bot);
            }
        });
        setPerms(botNames);
        return { success: true };
    }
};

module.exports = { db, UserDB, PermissionDB };
