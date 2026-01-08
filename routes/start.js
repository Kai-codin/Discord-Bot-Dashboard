var Modules = require("../modules/loader");
var fastFolderSize = require("fast-folder-size");
var Uploader = require("express-fileupload");
var System = require("systeminformation");
var Terminal = require("system-commands");
var session = require("express-session");
var bodyParser = require("body-parser");
var express = require("express");
var chalk = require("chalk");
var https = require("https");
var pm2 = require("pm2");
var fs = require("fs");
var router = express.Router();
var up = __dirname.replace("routes", "");

// Import permission checking
var { requireBotAccess } = require("../modules/authMiddleware");

/**
 * Detects if a bot is Python or JavaScript based on config files
 * @param {string} botPath - Path to the bot directory
 * @returns {object} Bot configuration with type and main entry
 */
function detectBotType(botPath) {
    var botConfigPath = "".concat(botPath, "/bot.config.json");
    var packagePath = "".concat(botPath, "/package.json");
    
    // Check for Python bot config first
    if (fs.existsSync(botConfigPath)) {
        try {
            var config = JSON.parse(fs.readFileSync(botConfigPath, "utf8"));
            if (config.type === "python") {
                return {
                    type: "python",
                    main: config.main,
                    interpreter: config.interpreter || "python3",
                    config: config
                };
            }
        } catch (err) {
            console.error("Error reading bot.config.json:", err);
        }
    }
    
    // Fall back to package.json for JavaScript bots
    if (fs.existsSync(packagePath)) {
        try {
            var pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
            return {
                type: pkg.type || "javascript",
                main: pkg.main,
                config: pkg
            };
        } catch (err) {
            console.error("Error reading package.json:", err);
        }
    }
    
    return null;
}

router.get("/:name", requireBotAccess, function (req, res) {
    if (process.env.LOGIN_REQUIRED == "true") {
        if (!req.session.username) {
            res.end(JSON.stringify({
                Success: false,
                Message: process.env.LOGIN_REQUIRED_MESSAGE,
            }));
            return;
        }
    }
    
    var botPath = "".concat(up, "/").concat(process.env.SECRET_PATH, "/").concat(req.params.name);
    
    if (!fs.existsSync(botPath)) {
        res.end(JSON.stringify({
            Success: false,
            Message: "Directory For This Application is Broken or Does Not Exist",
        }));
        return;
    }
    
    var botInfo = detectBotType(botPath);
    
    if (!botInfo) {
        res.end(JSON.stringify({
            Success: false,
            Message: "No valid configuration found. Please ensure the bot has a package.json (JavaScript) or bot.config.json (Python) file.",
        }));
        return;
    }
    
    if (botInfo.type === "python") {
        // Python bot startup
        var requirementsPath = "".concat(botPath, "/requirements.txt");
        if (fs.existsSync(requirementsPath)) {
            Terminal("cd ".concat(botPath, " && pip3 install --break-system-packages -r requirements.txt"))
                .then(function (data) { console.log("Python dependencies checked"); })
                .catch(function (err) { console.log("Warning: Could not install Python dependencies"); });
        }
        
        pm2.start({
            watch: false,
            daemon: false,
            detached: true,
            min_uptime: 5000,
            watch_delay: 5000,
            autorestart: false,
            watch_ignore: true,
            lines: process.env.MAX_LOG_LINES,
            max_restarts: process.env.MAX_RELOADS,
            restart_delay: process.env.RESTART_DELAY,
            name: "".concat(process.env.PROCESS_SECRET.toUpperCase(), "_").concat(req.params.name),
            script: "".concat(botPath, "/").concat(botInfo.main),
            interpreter: botInfo.interpreter || "python3",
            out_file: "".concat(up, "/").concat(process.env.SECRET_PATH, "/logs/").concat(req.params.name, ".strout.log"),
            error_file: "".concat(up, "/").concat(process.env.SECRET_PATH, "/logs/").concat(req.params.name, ".strerr.log"),
            max_memory_restart: "".concat(parseFloat(process.env.MAXIMUM_RAM_BYTES) / 1000000, "M"),
        }, function (err, apps) {
            if (err) {
                res.end(JSON.stringify({ Success: false, Message: err.toString() }));
                return;
            }
            res.end(JSON.stringify({
                Success: true,
                Message: "".concat(req.params.name, " (Python) Started"),
            }));
        });
    } else {
        // JavaScript bot startup (original logic)
        var PackageFile = "".concat(botPath, "/package.json");
        if (fs.existsSync(PackageFile)) {
            fs.readFile(PackageFile, "utf8", function (err, data) {
                if (err) {
                    res.end(JSON.stringify({ Success: false, Message: err.toString() }));
                    return;
                }
                var Package = JSON.parse(data);
                pm2.start({
                    watch: false,
                    daemon: false,
                    detached: true,
                    min_uptime: 5000,
                    watch_delay: 5000,
                    autorestart: false,
                    watch_ignore: true,
                    lines: process.env.MAX_LOG_LINES,
                    max_restarts: process.env.MAX_RELOADS,
                    restart_delay: process.env.RESTART_DELAY,
                    name: "".concat(process.env.PROCESS_SECRET.toUpperCase(), "_").concat(req.params.name),
                    script: "".concat(botPath, "/").concat(Package.main),
                    out_file: "".concat(up, "/").concat(process.env.SECRET_PATH, "/logs/").concat(req.params.name, ".strout.log"),
                    error_file: "".concat(up, "/").concat(process.env.SECRET_PATH, "/logs/").concat(req.params.name, ".strerr.log"),
                    max_memory_restart: "".concat(parseFloat(process.env.MAXIMUM_RAM_BYTES) / 1000000, "M"),
                }, function (err, apps) {
                    if (err) {
                        res.end(JSON.stringify({ Success: false, Message: err.toString() }));
                        return;
                    }
                    res.end(JSON.stringify({
                        Success: true,
                        Message: "".concat(req.params.name, " Started"),
                    }));
                });
            });
        } else {
            res.end(JSON.stringify({
                Success: false,
                Message: "Package.json for this app is invalid, please fix it or run \"cd ".concat(PackageFile.replace("../", __dirname), " && npm init -y\" in terminal."),
            }));
        }
    }
});
module.exports = router;
