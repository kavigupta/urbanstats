#!/bin/bash

set -e

python -m isort $(git ls-files '*.py')
python -m black $(git ls-files '*.py')