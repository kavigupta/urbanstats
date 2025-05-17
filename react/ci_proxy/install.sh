#!/bin/bash

apt update
apt install -y unzip nginx

curl -o- https://fnm.vercel.app/install | bash
source /root/.bashrc
fnm install 22

cd /root/urbanstats/react
npm ci

git clone --mirror https://github.com/densitydb/densitydb.github.io.git /root/urbanstats/react/ci_proxy/densitydb/densitydb.github.io

cp /root/urbanstats/react/ci_proxy/default /etc/nginx/sites-available/default
sed -i -e 's/user www-data/user root/g' /etc/nginx/nginx.conf
service nginx restart

cp /root/urbanstats/react/ci_proxy/urbanstats-ci-proxy.service /etc/systemd/system
service urbanstats-ci-proxy start
service urbanstats-ci-proxy enable
