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

/**
 * Install Python packages via pip for a specific bot
 * POST body: { bot_app: "bot_name", package_name: "package_to_install" }
 */
router.post("/", function (req, res) {
    if (process.env.LOGIN_REQUIRED == "true") {
        if (!req.session.username) {
            res.end(JSON.stringify({
                Success: false,
                Message: process.env.LOGIN_REQUIRED_MESSAGE,
            }));
            return;
        }
    }
    
    if (!req.body.bot_app) {
        res.end(JSON.stringify({
            Success: false,
            Message: "Please provide a bot application name",
        }));
        return;
    }
    
    if (!req.body.package_name) {
        res.end(JSON.stringify({
            Success: false,
            Message: "Please provide a package name to install",
        }));
        return;
    }
    
    var botPath = "./".concat(process.env.SECRET_PATH, "/").concat(req.body.bot_app);
    
    if (!fs.existsSync(botPath)) {
        res.end(JSON.stringify({
            Success: false,
            Message: "Bot application not found",
        }));
        return;
    }
    
    // Check if it's a Python bot
    var botConfigPath = "".concat(botPath, "/bot.config.json");
    if (!fs.existsSync(botConfigPath)) {
        res.end(JSON.stringify({
            Success: false,
            Message: "This is not a Python bot. Use npm_install for JavaScript bots.",
        }));
        return;
    }
    
    try {
        var config = JSON.parse(fs.readFileSync(botConfigPath, "utf8"));
        if (config.type !== "python") {
            res.end(JSON.stringify({
                Success: false,
                Message: "This is not a Python bot. Use npm_install for JavaScript bots.",
            }));
            return;
        }
    } catch (err) {
        res.end(JSON.stringify({
            Success: false,
            Message: "Error reading bot configuration",
        }));
        return;
    }
    
    // Install the package using pip
    Terminal("cd ".concat(botPath, " && pip3 install --break-system-packages ").concat(req.body.package_name))
        .then(function (data) {
            // Update requirements.txt with the new package
            var requirementsPath = "".concat(botPath, "/requirements.txt");
            fs.readFile(requirementsPath, "utf8", function (err, existingReqs) {
                var reqs = existingReqs || "";
                var packageBase = req.body.package_name.split("==")[0].split(">=")[0].split("<=")[0];
                
                // Check if package already in requirements.txt
                if (!reqs.includes(packageBase)) {
                    fs.appendFile(requirementsPath, "\n".concat(req.body.package_name), function (err) {
                        if (err) {
                            console.error("Could not update requirements.txt:", err);
                        }
                    });
                }
            });
            
            res.end(JSON.stringify({
                Success: true,
                Message: "Successfully Installed ".concat(req.body.package_name),
                Data: data,
            }));
        })
        .catch(function (err) {
            res.end(JSON.stringify({
                Success: false,
                Message: "An Error Occurred",
                Error: err,
            }));
        });
});

/**
 * Install all requirements from requirements.txt
 * GET /:name - Install all dependencies for a Python bot
 */
router.get("/:name", function (req, res) {
    if (process.env.LOGIN_REQUIRED == "true") {
        if (!req.session.username) {
            res.end(JSON.stringify({
                Success: false,
                Message: process.env.LOGIN_REQUIRED_MESSAGE,
            }));
            return;
        }
    }
    
    var botPath = "./".concat(process.env.SECRET_PATH, "/").concat(req.params.name);
    
    if (!fs.existsSync(botPath)) {
        res.end(JSON.stringify({
            Success: false,
            Message: "Bot application not found",
        }));
        return;
    }
    
    var requirementsPath = "".concat(botPath, "/requirements.txt");
    
    if (!fs.existsSync(requirementsPath)) {
        res.end(JSON.stringify({
            Success: false,
            Message: "No requirements.txt found for this bot",
        }));
        return;
    }
    
    Terminal("cd ".concat(botPath, " && pip3 install --break-system-packages -r requirements.txt"))
        .then(function (data) {
            res.end(JSON.stringify({
                Success: true,
                Message: "Successfully Installed All Python Dependencies",
                Data: data,
            }));
        })
        .catch(function (err) {
            res.end(JSON.stringify({
                Success: false,
                Message: "An Error Occurred While Installing Dependencies",
                Error: err,
            }));
        });
});

module.exports = router;
