const { UserDB, PermissionDB } = require('./database');

/**
 * Middleware to require authentication
 */
function requireAuth(req, res, next) {
    if (process.env.LOGIN_REQUIRED !== 'true') {
        // If login not required, treat as admin
        req.user = { id: 0, username: 'anonymous', role: 'admin' };
        return next();
    }

    if (!req.session || !req.session.userId) {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(401).json({
                Success: false,
                Message: 'Authentication required'
            });
        }
        return res.redirect('/login');
    }

    const user = UserDB.getById(req.session.userId);
    if (!user) {
        req.session.destroy();
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(401).json({
                Success: false,
                Message: 'Session invalid'
            });
        }
        return res.redirect('/login');
    }

    req.user = user;
    next();
}

/**
 * Middleware to require admin role
 */
function requireAdmin(req, res, next) {
    if (process.env.LOGIN_REQUIRED !== 'true') {
        req.user = { id: 0, username: 'anonymous', role: 'admin' };
        return next();
    }

    if (!req.user || req.user.role !== 'admin') {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(403).json({
                Success: false,
                Message: 'Admin access required'
            });
        }
        return res.status(403).send('Admin access required');
    }
    next();
}

/**
 * Middleware to check if user has access to a specific bot
 * Bot name should be in req.params.name or req.body.name or req.body.bot_app
 */
function requireBotAccess(req, res, next) {
    if (process.env.LOGIN_REQUIRED !== 'true') {
        return next();
    }

    const botName = req.params.name || req.body.name || req.body.bot_app;
    
    if (!botName) {
        return next(); // No specific bot requested
    }

    // Get user from session if not attached
    if (!req.user && req.session?.userId) {
        req.user = UserDB.getById(req.session.userId);
    }

    if (!req.user) {
        return res.status(401).json({
            Success: false,
            Message: 'Authentication required'
        });
    }

    if (!PermissionDB.hasAccess(req.user.id, botName)) {
        return res.status(403).json({
            Success: false,
            Message: 'You do not have access to this bot'
        });
    }

    next();
}

/**
 * Middleware to attach user info to request if logged in
 */
function attachUser(req, res, next) {
    if (req.session && req.session.userId) {
        const user = UserDB.getById(req.session.userId);
        if (user) {
            req.user = user;
        }
    }
    next();
}

/**
 * Filter a list of apps based on user permissions
 */
function filterAppsByPermission(apps, userId) {
    if (process.env.LOGIN_REQUIRED !== 'true') {
        return apps;
    }

    const accessibleBots = PermissionDB.getAccessibleBots(userId);
    
    // null means admin with access to all
    if (accessibleBots === null) {
        return apps;
    }

    return apps.filter(app => {
        const appName = app.App?.Name || app.name || app;
        return accessibleBots.includes(appName);
    });
}

module.exports = {
    requireAuth,
    requireAdmin,
    requireBotAccess,
    attachUser,
    filterAppsByPermission
};
