#!/bin/bash
set -e

apt update
apt install -y nginx

git clone --mirror https://github.com/densitydb/densitydb.github.io.git /root/urbanstats/react/ci_proxy/densitydb/densitydb.github.io

cp /root/urbanstats/react/ci_proxy/default /etc/nginx/sites-available/default
sed -i -e 's/user www-data/user root/g' /etc/nginx/nginx.conf
service nginx restart

cp /root/urbanstats/react/ci_proxy/urbanstats-ci-proxy.service /etc/systemd/system
systemctl daemon-reload
systemctl start urbanstats-ci-proxy.service
systemctl enable urbanstats-ci-proxy.service
