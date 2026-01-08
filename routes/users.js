var { UserDB } = require("../modules/database");
var { requireAuth, requireAdmin } = require("../modules/authMiddleware");
var express = require("express");
var router = express.Router();

// Get all users (admin only)
router.get("/", requireAuth, requireAdmin, function (req, res) {
    try {
        const users = UserDB.getAll();
        res.json({
            Success: true,
            Data: users
        });
    } catch (err) {
        res.status(500).json({
            Success: false,
            Message: "Error fetching users",
            Error: err.message
        });
    }
});

// Get single user (admin only)
router.get("/:id", requireAuth, requireAdmin, function (req, res) {
    try {
        const user = UserDB.getById(parseInt(req.params.id));
        if (!user) {
            return res.status(404).json({
                Success: false,
                Message: "User not found"
            });
        }
        res.json({
            Success: true,
            Data: user
        });
    } catch (err) {
        res.status(500).json({
            Success: false,
            Message: "Error fetching user",
            Error: err.message
        });
    }
});

// Create new user (admin only)
router.post("/", requireAuth, requireAdmin, function (req, res) {
    const { username, password, role } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            Success: false,
            Message: "Username and password are required"
        });
    }

    if (username.length < 3) {
        return res.status(400).json({
            Success: false,
            Message: "Username must be at least 3 characters"
        });
    }

    if (password.length < 4) {
        return res.status(400).json({
            Success: false,
            Message: "Password must be at least 4 characters"
        });
    }

    const validRoles = ['admin', 'user'];
    if (role && !validRoles.includes(role)) {
        return res.status(400).json({
            Success: false,
            Message: "Invalid role. Must be 'admin' or 'user'"
        });
    }

    const result = UserDB.create(username, password, role || 'user');

    if (result.success) {
        res.json({
            Success: true,
            Message: "User created successfully",
            Data: { id: result.id }
        });
    } else {
        res.status(400).json({
            Success: false,
            Message: result.error
        });
    }
});

// Update user (admin only)
router.put("/:id", requireAuth, requireAdmin, function (req, res) {
    const userId = parseInt(req.params.id);
    const { username, password, role } = req.body;

    const updates = {};
    if (username) updates.username = username;
    if (password) updates.password = password;
    if (role) {
        const validRoles = ['admin', 'user'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                Success: false,
                Message: "Invalid role. Must be 'admin' or 'user'"
            });
        }
        updates.role = role;
    }

    const result = UserDB.update(userId, updates);

    if (result.success) {
        res.json({
            Success: true,
            Message: "User updated successfully"
        });
    } else {
        res.status(400).json({
            Success: false,
            Message: result.error
        });
    }
});

// Delete user (admin only)
router.delete("/:id", requireAuth, requireAdmin, function (req, res) {
    const userId = parseInt(req.params.id);

    // Prevent self-deletion
    if (req.user && req.user.id === userId) {
        return res.status(400).json({
            Success: false,
            Message: "Cannot delete your own account"
        });
    }

    const result = UserDB.delete(userId);

    if (result.success) {
        res.json({
            Success: true,
            Message: "User deleted successfully"
        });
    } else {
        res.status(400).json({
            Success: false,
            Message: result.error
        });
    }
});

// Change own password (any authenticated user)
router.post("/change-password", requireAuth, function (req, res) {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            Success: false,
            Message: "Current password and new password are required"
        });
    }

    if (newPassword.length < 4) {
        return res.status(400).json({
            Success: false,
            Message: "New password must be at least 4 characters"
        });
    }

    // Verify current password
    const user = UserDB.getByUsername(req.user.username);
    const bcrypt = require('bcrypt');
    
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
        return res.status(400).json({
            Success: false,
            Message: "Current password is incorrect"
        });
    }

    UserDB.changePassword(req.user.id, newPassword);
    
    res.json({
        Success: true,
        Message: "Password changed successfully"
    });
});

module.exports = router;
