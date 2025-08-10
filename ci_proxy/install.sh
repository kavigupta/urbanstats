#!/bin/bash
set -e

apt update

# Certbot
# prereq: configure /etc/letsencrypt/.secrets/domain.tld.ini
if [ ! -f /etc/letsencrypt/.secrets/domain.tld.ini ]; then
    echo "Error: /etc/letsencrypt/.secrets/domain.tld.ini does not exist. Please configure it before running this script."
    exit 1
fi

apt install python3 python3-dev python3-venv libaugeas-dev gcc

python3 -m venv /opt/certbot/
/opt/certbot/bin/pip install --upgrade pip
/opt/certbot/bin/pip install certbot certbot-nginx
ln -s /opt/certbot/bin/certbot /usr/bin/certbot

/opt/certbot/bin/pip install certbot-dns-freedns
source /opt/certbot/bin/activate
pip install zope

certbot certonly \
  --authenticator dns-freedns \
  --dns-freedns-credentials /etc/letsencrypt/.secrets/domain.tld.ini \
  --dns-freedns-propagation-seconds 30 \
  --server https://acme-v02.api.letsencrypt.org/directory \
  --agree-tos \
  --rsa-key-size 4096 \
  -d 'staging.urbanstats.lukebrody.com' \
  -d '*.staging.urbanstats.lukebrody.com'

echo "0 0,12 * * * root /opt/certbot/bin/python -c 'import random; import time; time.sleep(random.random() * 3600)' && sudo certbot renew -q" | tee -a /etc/crontab > /dev/null

# End Certbot

apt install -y nginx

mkdir /root/urbanstats/ci_proxy/densitydb/repos

cp /root/urbanstats/ci_proxy/default /etc/nginx/sites-available/default
sed -i -e 's/user www-data/user root/g' /etc/nginx/nginx.conf
sed -z -i -e 's/\[Service\]\n/\[Service\]\nNice=-10\n/g' /usr/lib/systemd/system/nginx.service

cp /root/urbanstats/ci_proxy/urbanstats-ci-proxy.service /etc/systemd/system

systemctl daemon-reload

service nginx restart

systemctl start urbanstats-ci-proxy.service
systemctl enable urbanstats-ci-proxy.service

git clone --mirror https://github.com/densitydb/densitydb.github.io.git /root/urbanstats/ci_proxy/densitydb/densitydb.github.io
