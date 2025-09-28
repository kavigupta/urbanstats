#!/bin/bash

set -e

python -m vulture --min-confidence 10 --sort-by-size $(git ls-files '*.py' ':!:legacy') --exclude urbanstats/protobuf/data_files_pb2.py