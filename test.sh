#!/bin/bash

cd react

npx testcafe chrome test/article_test.js
npx testcafe firefox test/article_test.js

cd ..

python tests/check_images.py
