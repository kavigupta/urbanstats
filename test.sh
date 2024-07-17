#!/bin/bash

cd react

npx testcafe -e chrome test/article_test.js
npx testcafe -e firefox test/article_test.js

cd ..

python tests/check_images.py
