#!/bin/bash

cd $(dirname $0)
rm -r venv
python3 -m venv venv
source venv/bin/activate
pip3 install -r requirements.txt
uvicorn --host 0.0.0.0 --port 8080 src.main:app
