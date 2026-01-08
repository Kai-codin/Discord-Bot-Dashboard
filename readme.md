# Discord Bot Panel - DBP

![Image](/preview.jpg)

## What's New?

- New & Better UI
- New stat charts & graphs
- Web-based terminal/shell added
- Updated `.env`, new setting options added
- License changed from `CC-BY-4.0` to `MIT`
- **Python Bot Support** - Create and manage Python Discord bots alongside JavaScript bots!
- **Multi-User Authentication** - Database-backed user management with role-based access control!

## Features

### Multi-User Authentication & Permissions
DBP now supports multiple users with fine-grained permissions:

- **User Roles**: Admin (full access) and User (restricted access)
- **Bot Permissions**: Control which bots each user can access
- **SQLite Database**: Persistent user and permission storage
- **Admin Panel**: Manage users and permissions from `/users` page
- **Default Admin**: First user created from `USERNAME` and `PASSWORD` in `.env`

#### User Roles
- **Admin**: Full access to all bots and user management
- **User**: Only access to bots they have been granted permission to

#### Setting Up Users
1. Enable login by setting `LOGIN_REQUIRED=true` in `.env`
2. The default admin user is created from your `.env` credentials
3. Access the user management page at `/users` (admin only)
4. Create new users and assign bot permissions

### Multi-Language Bot Support
DBP now supports both **JavaScript (Node.js)** and **Python** Discord bots:

- **JavaScript Bots**: Use `discord.js` with Node.js runtime
- **Python Bots**: Use `discord.py` with Python 3 runtime

When creating a new bot, simply select the bot type from the dropdown menu. The dashboard will automatically:
- Generate appropriate template files (`index.js` for JS, `bot.py` for Python)
- Create dependency files (`package.json` for JS, `requirements.txt` for Python)
- Install dependencies using the correct package manager (`npm` for JS, `pip` for Python)
- Start bots with the correct interpreter

## Installation

### Standard Installation

```shell
## Install PM2 Globally
npm i pm2 -g
## Install forever Globally
npm i forever -g
## For Python bot support, ensure Python 3 and pip are installed
python3 --version
pip3 --version
```

```shell
## Download Code
git clone https://github.com/jareer12/DiscordBotPanel.git
## Open the folder
cd DiscordBotPanel
## Install Required Modules
npm install
### Rename .env
mv .env.example .env
```

### Docker Compose

```shell
## Clone this repository
git clone https://github.com/jareer12/DiscordBotPanel.git

## Rename .env - Change everything to your liking except PORT
mv .env.example .env
```

### Demo

[https://server.jubot.site/](https://server.jubot.site/create)

```env
Username: admin
Password: admin
```

### Env config

Once installation is done, you can change the `.env.example` file name to `.env` and configure it to your liking.

### Login System

By default the login system is disabled but you can enable it by changing `LOGIN_REQUIRED=false` to `LOGIN_REQUIRED=true` in your `.env` file. 

When login is enabled:
- Default admin credentials are created from `USERNAME` and `PASSWORD` in `.env`
- Users are stored in a SQLite database (`database/panel.db`)
- Admins can manage users from the `/users` page
- Regular users only see bots they have permission to access

### Final Setup

Once the installation and configuration is complete we can start our panel and run it. We'll be using `forever` to run the panel, the reason we'll use `forever` is that it can prevent downtime, so in case our panel runs into and error that it can not handle(which it most likely will), `forever` will re-start the panel by itself, preventing downtime.

#### Standard (non-docker)

```shell
## Open the folder
cd DiscordBotPanel
## Run the panel
forever start index.js
```

```shell
## This can also be used but is not recommended
cd DiscordBotPanel && node .
```

#### Docker Compose

```
docker compose up -d
```

### Nginx Config

```nginx
server  {
    listen 80;
    server_name    server.jubot.site; ## Your Server

    location / {
        proxy_pass         http://localhost:2278; ### Replace "2278" With Your Port(If You Changed).
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
    }
}
```
