var Modules = require("../modules/loader");
var up = __dirname.replace("routes", "");
var express = require("express");
var router = express.Router();
var chalk = require("chalk");
var fs = require("fs");
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
    if (!req.body.name) {
        res.end(JSON.stringify({
            Success: false,
            Message: "Could Not Find a Name for Application",
        }));
        return;
    }
    if (!req.body.main_entry) {
        res.end(JSON.stringify({
            Success: false,
            Message: "Please provide a main entry file",
        }));
        return;
    }
    Name = req.body.name;
    MainEntry = req.body.main_entry;
    BotType = req.body.bot_type || 'javascript'; // Default to javascript if not specified
    
    // Validate bot type
    if (!['javascript', 'python'].includes(BotType)) {
        res.end(JSON.stringify({
            Success: false,
            Message: "Invalid bot type. Must be 'javascript' or 'python'",
        }));
        return;
    }
    
    if (fs.existsSync("".concat(up, "/").concat(process.env.SECRET_PATH, "/").concat(Name))) {
        res.end(JSON.stringify({
            Success: false,
            Message: "Application ".concat(Name, " Already Exists"),
        }));
    }
    else {
        fs.mkdir("".concat(up, "/").concat(process.env.SECRET_PATH, "/").concat(Name), function (err, data) {
            fs.open("".concat(up, "/").concat(process.env.SECRET_PATH, "/logs/").concat(Name, ".strerr.log"), "w", function () {
                fs.open("".concat(up, "/").concat(process.env.SECRET_PATH, "/logs/").concat(Name, ".strout.log"), "w", function () {
                    Modules.InsertBase(Name, MainEntry, BotType);
                    Modules.Sync()
                        .then(function (data) {
                        res.end(JSON.stringify({
                            Success: true,
                            Message: "Successfuly Created ".concat(BotType === 'python' ? 'Python' : 'JavaScript', " Application"),
                        }));
                    })
                        .catch(function (err) {
                        res.end(JSON.stringify({
                            Success: false,
                            Message: "Looks Like An Error Occured Creating Discord Bot",
                        }));
                    });
                });
            });
        });
    }
});
module.exports = router;
