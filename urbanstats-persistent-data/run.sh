#!/bin/bash

certificate='/etc/letsencrypt/live/persistent.urbanstats.org/fullchain.pem'
key='/etc/letsencrypt/live/persistent.urbanstats.org/privkey.pem'

rm -r venv
# run the following commands to install pyenv and Python 3.10 if not already installed
# sudo apt update; sudo apt install build-essential libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev curl libncursesw5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev libffi-dev liblzma-dev
# curl -fsSL https://pyenv.run | bash
# ~/.pyenv/bin/pyenv install 3.10
virtualenv -p /root/.pyenv/versions/3.10.*/bin/python venv
source venv/bin/activate
pip3 install -r requirements.txt
uvicorn --ssl-certfile $certificate --ssl-keyfile $key --host 0.0.0.0 --port 443 urbanstats_persistent_data.main:app
