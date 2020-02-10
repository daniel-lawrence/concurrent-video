#!/bin/bash

REMOTE=root@concurrent.video

function buildGoPkg() {
    cd $1
    GOOS=linux GOARCH=amd64 go build -o ../bin/$1 .
    cd $OLDPWD
}

ssh $REMOTE mkdir -p /srv/ccv/bin
ssh $REMOTE mkdir -p /srv/ccv/web
ssh $REMOTE mkdir -p /srv/ccv/creds
ssh $REMOTE mkdir -p /tmp/ccv

# Build binaries
mkdir -p bin
buildGoPkg server

# Upload binaries
ssh $REMOTE "systemctl stop ccv-server"
scp -r bin/server $REMOTE:/srv/ccv/bin/server

# Copy credentials file
scp -r server/.key $REMOTE:/srv/ccv/creds/

# Upload web dist files
cd client
parcel build index.html
cd $OLDPWD
scp -r client/dist/* $REMOTE:/srv/ccv/web
scp -r Caddyfile $REMOTE:/etc/caddy/Caddyfile

# Set up systemd services
scp -r systemd-services $REMOTE:/tmp/ccv

# Enable/restart services
ssh $REMOTE "cp -r /tmp/ccv/systemd-services/. /lib/systemd/system/ ;
systemctl daemon-reload ;
systemctl enable ccv-server caddy ;
systemctl reload caddy ;
systemctl start ccv-server"
