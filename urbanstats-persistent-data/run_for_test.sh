#!/bin/bash

cd $(dirname $0)
rm -r venv
virtualenv -p python3 venv
source venv/bin/activate
pip3 install -r requirements.txt
gunicorn -b 0.0.0.0:54579 urbanstats_persistent_data.main:app
