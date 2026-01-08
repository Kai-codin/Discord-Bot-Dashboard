var Modules = require("../modules/loader");
var exec = require("child_process").exec;
var session = require("express-session");
var express = require("express");
var pm2 = require("pm2");
var fs = require("fs");
var router = express.Router();

/**
 * Detects if a bot is Python or JavaScript based on config files
 * @param {string} botPath - Path to the bot directory
 * @returns {string} Bot type: 'python' or 'javascript'
 */
function getBotType(botPath) {
    var botConfigPath = "".concat(botPath, "/bot.config.json");
    
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

router.post("/", function (req, res) {
    if (req.body.new_main) {
        if (req.body.name) {
            var botPath = "./".concat(process.env.SECRET_PATH, "/").concat(req.body.name);
            var botType = getBotType(botPath);
            
            // Add appropriate extension based on bot type
            if (botType === "python") {
                if (!req.body.new_main.toString().endsWith(".py")) {
                    req.body.new_main = "".concat(req.body.new_main, ".py");
                }
                var ConfigPath = "".concat(botPath, "/bot.config.json");
                if (fs.existsSync(ConfigPath)) {
                    fs.readFile(ConfigPath, "utf8", function (err, data) {
                        var Data = JSON.parse(data);
                        Data.main = req.body.new_main;
                        if (!fs.existsSync("".concat(botPath, "/").concat(req.body.new_main))) {
                            fs.open("".concat(botPath, "/").concat(req.body.new_main), "w", function (err, data) { });
                        }
                        fs.writeFile(ConfigPath, JSON.stringify(Data, null, 4), function (err, data) {
                            res.end(JSON.stringify({
                                Success: true,
                                Message: "Successfuly Updated Python Bot Entry",
                                data: data,
                            }));
                        });
                    });
                } else {
                    res.end(JSON.stringify({
                        Success: false,
                        Message: "Bot configuration not found",
                    }));
                }
            } else {
                // JavaScript bot (original logic)
                if (!req.body.new_main.toString().endsWith(".js")) {
                    req.body.new_main = "".concat(req.body.new_main, ".js");
                }
                var Path = "".concat(botPath, "/package.json");
                if (fs.existsSync(Path)) {
                    fs.readFile(Path, "utf8", function (err, data) {
                        var Data = JSON.parse(data);
                        Data.main = req.body.new_main;
                        if (!fs.existsSync("".concat(botPath, "/").concat(req.body.new_main))) {
                            fs.open("".concat(botPath, "/").concat(req.body.new_main), "w", function (err, data) { });
                        }
                        fs.writeFile(Path, JSON.stringify(Data, null, 4), function (err, data) {
                            res.end(JSON.stringify({
                                Success: true,
                                Message: "Successfuly Updated",
                                data: data,
                            }));
                        });
                    });
                }
                else {
                    res.end(JSON.stringify({
                        Success: false,
                        Message: "Bot Does Not Exist",
                    }));
                }
            }
        }
        else {
            res.end(JSON.stringify({
                Success: false,
                Message: "No Bot Name Given/Found",
            }));
        }
    }
    else {
        res.end(JSON.stringify({
            Success: false,
            Message: "New Main Entry Not Found",
        }));
    }
});
module.exports = router;
