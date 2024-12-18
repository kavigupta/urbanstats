#!/bin/bash

cd $(dirname $0)
source venv/bin/activate
gunicorn -b 0.0.0.0:54579 urbanstats_persistent_data.main:app
