var { PermissionDB, UserDB } = require("../modules/database");
var { requireAuth, requireAdmin } = require("../modules/authMiddleware");
var express = require("express");
var router = express.Router();

// Get all permissions (admin only)
router.get("/", requireAuth, requireAdmin, function (req, res) {
    try {
        const permissions = PermissionDB.getAll();
        res.json({
            Success: true,
            Data: permissions
        });
    } catch (err) {
        res.status(500).json({
            Success: false,
            Message: "Error fetching permissions",
            Error: err.message
        });
    }
});

// Get permissions for a specific user (admin only)
router.get("/user/:userId", requireAuth, requireAdmin, function (req, res) {
    try {
        const userId = parseInt(req.params.userId);
        const user = UserDB.getById(userId);
        
        if (!user) {
            return res.status(404).json({
                Success: false,
                Message: "User not found"
            });
        }

        const permissions = PermissionDB.getByUser(userId);
        res.json({
            Success: true,
            Data: {
                user: user,
                permissions: permissions.map(p => p.bot_name),
                isAdmin: user.role === 'admin'
            }
        });
    } catch (err) {
        res.status(500).json({
            Success: false,
            Message: "Error fetching permissions",
            Error: err.message
        });
    }
});

// Get my accessible bots (any authenticated user)
router.get("/my-bots", requireAuth, function (req, res) {
    try {
        const accessibleBots = PermissionDB.getAccessibleBots(req.user.id);
        res.json({
            Success: true,
            Data: {
                isAdmin: req.user.role === 'admin',
                bots: accessibleBots // null means all bots for admin
            }
        });
    } catch (err) {
        res.status(500).json({
            Success: false,
            Message: "Error fetching permissions",
            Error: err.message
        });
    }
});

// Grant permission (admin only)
router.post("/grant", requireAuth, requireAdmin, function (req, res) {
    const { userId, botName } = req.body;

    if (!userId || !botName) {
        return res.status(400).json({
            Success: false,
            Message: "userId and botName are required"
        });
    }

    const user = UserDB.getById(parseInt(userId));
    if (!user) {
        return res.status(404).json({
            Success: false,
            Message: "User not found"
        });
    }

    const result = PermissionDB.grant(parseInt(userId), botName);

    if (result.success) {
        res.json({
            Success: true,
            Message: `Access to ${botName} granted to ${user.username}`
        });
    } else {
        res.status(400).json({
            Success: false,
            Message: result.error
        });
    }
});

// Revoke permission (admin only)
router.post("/revoke", requireAuth, requireAdmin, function (req, res) {
    const { userId, botName } = req.body;

    if (!userId || !botName) {
        return res.status(400).json({
            Success: false,
            Message: "userId and botName are required"
        });
    }

    const result = PermissionDB.revoke(parseInt(userId), botName);

    res.json({
        Success: true,
        Message: "Permission revoked"
    });
});

// Set all permissions for a user (admin only)
router.post("/set", requireAuth, requireAdmin, function (req, res) {
    const { userId, bots } = req.body;

    if (!userId || !Array.isArray(bots)) {
        return res.status(400).json({
            Success: false,
            Message: "userId and bots array are required"
        });
    }

    const user = UserDB.getById(parseInt(userId));
    if (!user) {
        return res.status(404).json({
            Success: false,
            Message: "User not found"
        });
    }

    const result = PermissionDB.setPermissions(parseInt(userId), bots);

    if (result.success) {
        res.json({
            Success: true,
            Message: `Permissions updated for ${user.username}`
        });
    } else {
        res.status(400).json({
            Success: false,
            Message: result.error
        });
    }
});

// Check if current user has access to a bot
router.get("/check/:botName", requireAuth, function (req, res) {
    const hasAccess = PermissionDB.hasAccess(req.user.id, req.params.botName);
    res.json({
        Success: true,
        HasAccess: hasAccess
    });
});

module.exports = router;
