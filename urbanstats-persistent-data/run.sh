#!/bin/bash

certificate='/etc/letsencrypt/live/persistent.urbanstats.org/fullchain.pem'
key='/etc/letsencrypt/live/persistent.urbanstats.org/privkey.pem'

rm -r venv
virtualenv -p python3 venv
source venv/bin/activate
pip3 install -r requirements.txt
gunicorn --workers=10 --timeout=100 -b 0.0.0.0:443 --certfile $certificate --keyfile $key urbanstats_persistent_data.main:app