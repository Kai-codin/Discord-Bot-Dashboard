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

// Import permission filtering
var { filterAppsByPermission } = require("../modules/authMiddleware");

/**
 * Detects if a bot is Python or JavaScript based on config files
 * @param {string} appName - Name of the application
 * @returns {string} Bot type: 'python' or 'javascript'
 */
function getBotType(appName) {
    var botPath = "".concat(up, "/").concat(process.env.SECRET_PATH, "/").concat(appName);
    var botConfigPath = "".concat(botPath, "/bot.config.json");
    
    // Check for Python bot config
    if (fs.existsSync(botConfigPath)) {
        try {
            var config = JSON.parse(fs.readFileSync(botConfigPath, "utf8"));
            if (config.type === "python") {
                return "python";
            }
        } catch (err) {
            // Ignore error
        }
    }
    
    return "javascript";
}

router.get("/", function (req, res) {
    if (process.env.LOGIN_REQUIRED == "true") {
        if (!req.session.username) {
            res.end(JSON.stringify({
                Success: false,
                Message: process.env.LOGIN_REQUIRED_MESSAGE,
            }));
            return;
        }
    }
    SecureData = [];
    pm2.list(function (err, list) {
        list.forEach(function (App) {
            if (App.name
                .toUpperCase()
                .startsWith("".concat(process.env.PROCESS_SECRET.toUpperCase()))) {
                var appName = App.name.replace("".concat(process.env.PROCESS_SECRET.toUpperCase(), "_"), "");
                var botType = getBotType(appName);
                SecureData.push({
                    CPU: App.monit.cpu,
                    Node_Version: App.pm2_env.node_version,
                    Memory: App.monit.memory,
                    Out_file: App.pm2_env.out_file,
                    Error_file: App.pm2_env.out_file,
                    Bot_Type: botType,
                    Interpreter: App.pm2_env.exec_interpreter || (botType === 'python' ? 'python3' : 'node'),
                    App: {
                        Name: appName,
                        Pid: App.pid,
                        Version: App.pm2_env.version,
                        Entry: App.pm2_env.script,
                        Status: App.pm2_env.status,
                        Created: App.pm2_env.created_at,
                        Created_Date: new Date(App.pm2_env.created_at).toLocaleString(),
                        Type: botType,
                    },
                });
            }
        });
        
        // Filter apps by user permissions
        var filteredData = filterAppsByPermission(SecureData, req.session?.userId);
        res.end(JSON.stringify(filteredData));
    });
});
module.exports = router;
