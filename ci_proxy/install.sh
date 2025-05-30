#!/bin/bash
set -e

apt update
apt install -y nginx

cp /root/urbanstats/ci_proxy/default /etc/nginx/sites-available/default
sed -i -e 's/user www-data/user root/g' /etc/nginx/nginx.conf
sed -z -i -e 's/\[Service\]\n/\[Service\]\nNice=-10\n/g' /usr/lib/systemd/system/nginx.service

cp /root/urbanstats/ci_proxy/urbanstats-ci-proxy.service /etc/systemd/system

systemctl daemon-reload

service nginx restart

systemctl start urbanstats-ci-proxy.service
systemctl enable urbanstats-ci-proxy.service

git clone --mirror https://github.com/densitydb/densitydb.github.io.git /root/urbanstats/ci_proxy/densitydb/densitydb.github.io
