FROM node:18

# Install Python 3 and pip for Python bot support
# Install build-essential for native npm modules (better-sqlite3, bcrypt)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3 /usr/bin/python

# Allow pip to install packages system-wide in Docker container
ENV PIP_BREAK_SYSTEM_PACKAGES=1

WORKDIR /src
COPY package*.json .
RUN npm install
COPY . .
EXPOSE 2278
CMD ["node","index.js"]