require("dotenv").config();
var fastFolderSize = require("fast-folder-size");
var Uploader = require("express-fileupload");
var Modules = require("./modules/loader");
var System = require("systeminformation");
var Terminal = require("system-commands");
var session = require("express-session");
var bodyParser = require("body-parser");
var express = require("express");
var cors = require("cors");
var chalk = require("chalk");
var https = require("https");
var pm2 = require("pm2");
var fs = require("fs");
var app = express();
var SETTINGS = require("./settings.json");
var Blacklist = SETTINGS.BLACK_LISTED_DIRS;

// Auth middleware
var { requireAuth, requireAdmin, requireBotAccess, attachUser } = require("./modules/authMiddleware");

app.set("trust proxy", true);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ extended: true }));
app.use(Uploader());
app.use(cors());
app.use(session({
    proxy: true,
    resave: false,
    saveUninitialized: true,
    secret: process.env.SECRET_PATH,
}));

// Attach user to all requests
app.use(attachUser);

// Public routes (no auth needed)
app.use("/file", require("".concat(__dirname, "/routes/file")));
app.use("/login", require("".concat(__dirname, "/routes/login")));

// User management routes (admin only)
app.use("/api/users", require("".concat(__dirname, "/routes/users")));
app.use("/api/permissions", require("".concat(__dirname, "/routes/permissions")));

// Protected routes (require auth)
app.use("/log", requireAuth, require("".concat(__dirname, "/routes/log")));
app.use("/dirs", requireAuth, require("".concat(__dirname, "/routes/dirs")));
app.use("/stop", requireAuth, require("".concat(__dirname, "/routes/stop")));
app.use("/info", requireAuth, require("".concat(__dirname, "/routes/info")));
app.use("/start", requireAuth, require("".concat(__dirname, "/routes/start")));
app.use("/usage", requireAuth, require("".concat(__dirname, "/routes/usage")));
app.use("/restart", requireAuth, require("".concat(__dirname, "/routes/restart")));
app.use("/terminal", requireAuth, require("".concat(__dirname, "/routes/terminal")));
app.use("/dir_size", requireAuth, require("".concat(__dirname, "/routes/dir_size")));
app.use("/list-apps", requireAuth, require("".concat(__dirname, "/routes/list-apps")));
app.use("/error_log", requireAuth, require("".concat(__dirname, "/routes/error_log")));
app.use("/rename_dir", requireAuth, require("".concat(__dirname, "/routes/rename_dir")));
app.use("/delete_app", requireAuth, require("".concat(__dirname, "/routes/delete_app")));
app.use("/create_app", requireAuth, require("".concat(__dirname, "/routes/create_app")));
app.use("/clone_repo", requireAuth, require("".concat(__dirname, "/routes/clone_repo")));
app.use("/sync_repo", requireAuth, require("".concat(__dirname, "/routes/sync_repo")));
app.use("/reload_apps", requireAuth, require("".concat(__dirname, "/routes/reload_apps")));
app.use("/panel_stats", requireAuth, require("".concat(__dirname, "/routes/panel_stats")));
app.use("/delete_logs", requireAuth, require("".concat(__dirname, "/routes/delete_logs")));
app.use("/npm_install", requireAuth, require("".concat(__dirname, "/routes/npm_install")));
app.use("/pip_install", requireAuth, require("".concat(__dirname, "/routes/pip_install")));
app.use("/create_file", requireAuth, require("".concat(__dirname, "/routes/create_file")));
app.use("/update_main", requireAuth, require("".concat(__dirname, "/routes/update_main")));
app.use("/update_file", requireAuth, require("".concat(__dirname, "/routes/update_file")));
app.use("/upload_file", requireAuth, require("".concat(__dirname, "/routes/upload_file")));
app.use("/delete_path", requireAuth, require("".concat(__dirname, "/routes/delete_path")));
app.use("/file_content", requireAuth, require("".concat(__dirname, "/routes/file_content")));
app.use("/create_folder", requireAuth, require("".concat(__dirname, "/routes/create_folder")));
app.use("/install_package", requireAuth, require("".concat(__dirname, "/routes/install_package")));
app.use("/delete_error_logs", requireAuth, require("".concat(__dirname, "/routes/delete_error_logs")));
app.use("/output_log", requireAuth, require("".concat(__dirname, "/routes/output_log")));
app.use("*", function (req, res, next) {
    if (process.env.LOGIN_REQUIRED == "true") {
        if (!req.session.username) {
            return res.sendFile("".concat(__dirname, "/pages/login.html"));
        }
    }
    next();
});
app.get("/", function (req, res) {
    res.redirect("/home");
});
app.get("/:name", function (req, res) {
    var Path = "".concat(__dirname, "/pages/").concat(req.params.name, ".html");
    if (fs.existsSync(Path)) {
        res.sendFile(Path);
    }
    else {
        res.json({ Sucess: false, Message: "Page not found" });
    }
});
app.get("/system", function (req, res) {
    System.diskLayout().then(function (data) {
        res.end(JSON.stringify(data));
    });
});
// Helper to sync all bots from GitHub and start them on container startup
async function syncAndStartBots() {
    try {
        // Sync all bots from GitHub
        console.log(chalk.hex("#3082CF")("[Startup] Syncing all bots from GitHub..."));
        // This assumes you have a list-apps route that lists all bots
        const axios = require('axios');
        const baseUrl = `http://localhost:${process.env.PORT}`;
        // Wait for the server to be ready before making requests
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Get all apps
        let bots = [];
        try {
            const res = await axios.get(`${baseUrl}/list-apps`);
            if (res.data && Array.isArray(res.data.Data)) {
                bots = res.data.Data;
            }
        } catch (e) {
            console.log("[Startup] Could not fetch bot list:", e.message);
        }
        // Sync each bot
        for (const bot of bots) {
            try {
                await axios.post(`${baseUrl}/sync_repo`, { name: bot.Name });
                console.log(`[Startup] Synced bot: ${bot.Name}`);
            } catch (e) {
                console.log(`[Startup] Failed to sync bot ${bot.Name}:`, e.message);
            }
        }
        // Start all bots
        try {
            await axios.get(`${baseUrl}/start/all`);
            console.log("[Startup] Started all bots.");
        } catch (e) {
            console.log("[Startup] Failed to start all bots:", e.message);
        }
    } catch (err) {
        console.log("[Startup] Error in syncAndStartBots:", err);
    }
}

app.listen(parseFloat(process.env.PORT), function () {
    console.clear();
    console.log(chalk.hex("#3082CF")(fs.readFileSync("./art.txt", "utf-8") || "", "\n\n[!] Dashboard Is Open On http://localhost:".concat(parseFloat(process.env.PORT))));
    // Sync bots and start all on container startup
    syncAndStartBots();
});
