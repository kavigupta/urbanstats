#!/bin/bash

cd $(dirname $0)
rm -r venv
virtualenv -p python3 venv
source venv/bin/activate
pip3 install -r requirements.txt
