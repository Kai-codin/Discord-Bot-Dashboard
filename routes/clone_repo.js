var express = require("express");
var router = express.Router();
var { exec } = require("child_process");
var fs = require("fs");
var path = require("path");
var Modules = require("../modules/loader");

var up = __dirname.replace("routes", "");

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

    const { repo_url, name, main_entry, bot_type } = req.body;

    if (!repo_url) {
        res.end(JSON.stringify({
            Success: false,
            Message: "Please provide a GitHub repository URL",
        }));
        return;
    }

    if (!name) {
        res.end(JSON.stringify({
            Success: false,
            Message: "Please provide a name for the application",
        }));
        return;
    }

    if (!main_entry) {
        res.end(JSON.stringify({
            Success: false,
            Message: "Please provide a main entry file",
        }));
        return;
    }

    // Validate bot type
    const validBotType = bot_type || 'javascript';
    if (!['javascript', 'python'].includes(validBotType)) {
        res.end(JSON.stringify({
            Success: false,
            Message: "Invalid bot type. Must be 'javascript' or 'python'",
        }));
        return;
    }

    // Validate GitHub URL format
    const githubUrlPattern = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+(\.git)?$/i;
    if (!githubUrlPattern.test(repo_url)) {
        res.end(JSON.stringify({
            Success: false,
            Message: "Invalid GitHub repository URL. Please use format: https://github.com/username/repo",
        }));
        return;
    }

    const botPath = path.join(up, process.env.SECRET_PATH, name);
    const logsPath = path.join(up, process.env.SECRET_PATH, "logs");

    // Check if application already exists
    if (fs.existsSync(botPath)) {
        res.end(JSON.stringify({
            Success: false,
            Message: `Application "${name}" already exists`,
        }));
        return;
    }

    // Ensure logs directory exists
    if (!fs.existsSync(logsPath)) {
        fs.mkdirSync(logsPath, { recursive: true });
    }

    // Clone the repository
    const cloneCommand = `git clone "${repo_url}" "${botPath}"`;

    exec(cloneCommand, { maxBuffer: 50 * 1024 * 1024 }, function (error, stdout, stderr) {
        if (error) {
            // Clean up if clone failed
            if (fs.existsSync(botPath)) {
                fs.rmSync(botPath, { recursive: true, force: true });
            }
            
            res.end(JSON.stringify({
                Success: false,
                Message: `Failed to clone repository: ${error.message}`,
            }));
            return;
        }

        // Create log files
        const stdoutLog = path.join(logsPath, `${name}.strout.log`);
        const stderrLog = path.join(logsPath, `${name}.strerr.log`);

        try {
            fs.writeFileSync(stdoutLog, "");
            fs.writeFileSync(stderrLog, "");
        } catch (err) {
            console.error("Error creating log files:", err);
        }

        // Create or update bot.config.json for the cloned repo
        const configPath = path.join(botPath, "bot.config.json");
        const botConfig = {
            name: name,
            version: "1.0.0",
            description: `Cloned from ${repo_url}`,
            main: main_entry,
            type: validBotType,
            interpreter: validBotType === 'python' ? "python3" : "node",
            scripts: {},
            keywords: [],
            license: "MIT",
            source: repo_url,
            cloned_at: new Date().toISOString()
        };

        try {
            fs.writeFileSync(configPath, JSON.stringify(botConfig, null, 2));
        } catch (err) {
            console.error("Error creating bot config:", err);
        }

        // Sync with PM2
        Modules.Sync()
            .then(function () {
                res.end(JSON.stringify({
                    Success: true,
                    Message: `Successfully cloned ${validBotType === 'python' ? 'Python' : 'JavaScript'} bot from GitHub`,
                }));
            })
            .catch(function (err) {
                res.end(JSON.stringify({
                    Success: true,
                    Message: "Repository cloned but there was an issue syncing with PM2",
                }));
            });
    });
});

module.exports = router;
