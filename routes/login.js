var { UserDB } = require("../modules/database");
var express = require("express");
var router = express.Router();

router.post("/", function (req, res) {
    if (!req.body.username) {
        res.end(JSON.stringify({
            Success: false,
            Message: "No Username Given",
        }));
        return;
    }
    if (!req.body.password) {
        res.end(JSON.stringify({
            Success: false,
            Message: "You forgot to give a password",
        }));
        return;
    }
    
    // Verify credentials against database
    const user = UserDB.verifyPassword(req.body.username, req.body.password);
    
    if (user) {
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;
        req.session.save(function (err) {
            if (err) {
                console.log(err);
            }
            res.end(JSON.stringify({
                Success: true,
                Message: "Successfully Logged in",
                User: {
                    username: user.username,
                    role: user.role
                }
            }));
        });
    }
    else {
        res.end(JSON.stringify({
            Success: false,
            Message: "Wrong Username/Password",
        }));
    }
});

// Get current user info
router.get("/me", function (req, res) {
    if (req.session && req.session.userId) {
        const user = UserDB.getById(req.session.userId);
        if (user) {
            res.json({
                Success: true,
                User: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                }
            });
            return;
        }
    }
    res.json({
        Success: false,
        Message: "Not logged in"
    });
});

module.exports = router;
