var Modules = require("../modules/loader");
var up = __dirname.replace("routes", "");
var express = require("express");
var router = express.Router();
var chalk = require("chalk");
var fs = require("fs");
var path = require("path");
var pm2 = require("pm2");

// Import permission checking
var { PermissionDB } = require("../modules/database");

router.post("/", function (req, res) {
    // Check if user has access to this bot
    if (process.env.LOGIN_REQUIRED == "true" && req.session.userId) {
        var userRole = req.session.role;
        var botName = req.body.name;
        
        if (userRole !== 'admin' && !PermissionDB.hasAccess(req.session.userId, botName)) {
            res.end(JSON.stringify({
                Success: false,
                Message: "You don't have permission to delete this bot",
            }));
            return;
        }
    }

    if (req.body.name) {
        if (fs.existsSync("".concat(up, "/").concat(process.env.SECRET_PATH, "/").concat(req.body.name))) {
            fs.unlink("".concat(up, "/").concat(process.env.SECRET_PATH, "/logs/").concat(req.body.name, ".strout.log"), function (err, data) { });
            fs.unlink("".concat(up, "/").concat(process.env.SECRET_PATH, "/logs/").concat(req.body.name, ".strerr.log"), function (err, data) { });
            pm2.stop("".concat(process.env.PROCESS_SECRET.toUpperCase(), "_").concat(req.body.name), function (err, info) {
                pm2.delete("".concat(process.env.PROCESS_SECRET.toUpperCase(), "_").concat(req.body.name));
                if (err) {
                    res.end(JSON.stringify({
                        Success: false,
                        Message: "An Error Occured While Deleting App",
                    }));
                }
                else {
                    // Remove permissions for this bot
                    try {
                        PermissionDB.revokeAllForBot(req.body.name);
                    } catch (e) {
                        // Ignore permission cleanup errors
                    }
                    
                    Modules.Sync()
                        .then(function (data) {
                        fs.rmdirSync("".concat(up, "/").concat(process.env.SECRET_PATH, "/").concat(req.body.name), {
                            recursive: true,
                            force: true,
                        });
                        res.end(JSON.stringify({
                            Success: true,
                            Message: "Successfuly Deleted Discord Bot",
                        }));
                    })
                        .catch(function (err) {
                        res.end(JSON.stringify({
                            Success: false,
                            Message: "Looks Like An Error Occured Deleting Discord Bot",
                        }));
                    });
                }
            });
        }
    }
    else {
        res.end(JSON.stringify({
            Success: false,
            Message: "No Name Given",
        }));
    }
});
module.exports = router;
