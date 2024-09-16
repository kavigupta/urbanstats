#!/bin/bash

cd react

for browser in "chrome --no-first-run '--window-size=1400,800' --hide-scrollbars --disable-gpu"; do
    for test_file in test/*_test.ts ; do
        npx testcafe -e "$browser" $test_file -s thumbnails=false
    done
done

cd ..

python tests/check_images.py
