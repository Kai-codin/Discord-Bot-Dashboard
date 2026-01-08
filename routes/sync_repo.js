var express = require("express");
var router = express.Router();
var { exec } = require("child_process");
var fs = require("fs");
var path = require("path");

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

    const { name } = req.body;

    if (!name) {
        res.end(JSON.stringify({
            Success: false,
            Message: "Please provide the application name",
        }));
        return;
    }

    const botPath = path.join(up, process.env.SECRET_PATH, name);

    // Check if application exists
    if (!fs.existsSync(botPath)) {
        res.end(JSON.stringify({
            Success: false,
            Message: `Application "${name}" does not exist`,
        }));
        return;
    }

    // Check if it's a git repository
    const gitDir = path.join(botPath, ".git");
    if (!fs.existsSync(gitDir)) {
        res.end(JSON.stringify({
            Success: false,
            Message: `Application "${name}" is not a git repository. Only cloned repositories can be synced.`,
        }));
        return;
    }

    // Get current remote URL for display
    exec(`cd "${botPath}" && git remote get-url origin`, function (remoteErr, remoteUrl) {
        const displayUrl = remoteUrl ? remoteUrl.trim() : 'unknown';

        // Fetch and pull latest changes
        // Using git fetch + git reset to handle force pushes and divergent branches
        const syncCommand = `cd "${botPath}" && git fetch origin && git reset --hard origin/$(git rev-parse --abbrev-ref HEAD)`;

        exec(syncCommand, { maxBuffer: 50 * 1024 * 1024 }, function (error, stdout, stderr) {
            if (error) {
                // Try a simpler pull if the reset approach fails
                exec(`cd "${botPath}" && git pull --rebase`, { maxBuffer: 50 * 1024 * 1024 }, function (pullErr, pullOut, pullStderr) {
                    if (pullErr) {
                        res.end(JSON.stringify({
                            Success: false,
                            Message: `Failed to sync repository: ${pullErr.message}`,
                            Details: pullStderr || pullErr.message
                        }));
                        return;
                    }

                    res.end(JSON.stringify({
                        Success: true,
                        Message: `Successfully synced "${name}" from ${displayUrl}`,
                        Output: pullOut || "Repository is up to date"
                    }));
                });
                return;
            }

            res.end(JSON.stringify({
                Success: true,
                Message: `Successfully synced "${name}" from ${displayUrl}`,
                Output: stdout || "Repository is up to date"
            }));
        });
    });
});

// GET route to check if an app is a git repo
router.get("/status/:name", function (req, res) {
    if (process.env.LOGIN_REQUIRED == "true") {
        if (!req.session.username) {
            res.end(JSON.stringify({
                Success: false,
                Message: process.env.LOGIN_REQUIRED_MESSAGE,
            }));
            return;
        }
    }

    const { name } = req.params;
    const botPath = path.join(up, process.env.SECRET_PATH, name);

    if (!fs.existsSync(botPath)) {
        res.end(JSON.stringify({
            Success: false,
            IsGitRepo: false,
            Message: "Application does not exist"
        }));
        return;
    }

    const gitDir = path.join(botPath, ".git");
    const isGitRepo = fs.existsSync(gitDir);

    if (!isGitRepo) {
        res.end(JSON.stringify({
            Success: true,
            IsGitRepo: false,
            Message: "Not a git repository"
        }));
        return;
    }

    // Get remote URL and current branch
    exec(`cd "${botPath}" && git remote get-url origin 2>/dev/null && git rev-parse --abbrev-ref HEAD`, function (err, stdout) {
        const lines = stdout ? stdout.trim().split('\n') : [];
        const remoteUrl = lines[0] || 'unknown';
        const branch = lines[1] || 'main';

        // Check for uncommitted changes
        exec(`cd "${botPath}" && git status --porcelain`, function (statusErr, statusOut) {
            const hasChanges = statusOut && statusOut.trim().length > 0;

            // Get last commit info
            exec(`cd "${botPath}" && git log -1 --format="%h - %s (%cr)"`, function (logErr, logOut) {
                res.end(JSON.stringify({
                    Success: true,
                    IsGitRepo: true,
                    RemoteUrl: remoteUrl,
                    Branch: branch,
                    HasLocalChanges: hasChanges,
                    LastCommit: logOut ? logOut.trim() : 'Unknown'
                }));
            });
        });
    });
});

module.exports = router;
