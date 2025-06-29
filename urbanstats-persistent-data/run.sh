#!/bin/bash

certificate='/etc/letsencrypt/live/persistent.urbanstats.org/fullchain.pem'
key='/etc/letsencrypt/live/persistent.urbanstats.org/privkey.pem'

rm -r venv
virtualenv -p python3 venv
source venv/bin/activate
pip3 install -r requirements.txt
uvicorn --workers 10 --ssl-certfile $certificate --ssl-keyfile $key --port 443 urbanstats_persistent_data.main:app
