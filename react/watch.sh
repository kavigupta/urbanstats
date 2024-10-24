#!/bin/bash

set -e

cd ..
python create_website.py $1 --dev --no-data --no-geo --no-juxta
cd react
webpack serve --mode=development --watch --env directory=$1
