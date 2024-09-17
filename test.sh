#!/bin/bash

cd react

Xvfb :10 -ac &
export DISPLAY=:10
fluxbox >/dev/null 2>&1 &

for browser in "chrome --no-first-run '--window-size=1400,800' --hide-scrollbars --disable-gpu"; do
    for test_file in test/*_test.ts ; do
        npx testcafe -e "$browser" $test_file -s thumbnails=false
    done
done

cd ..

python tests/check_images.py

kill $(ps aux | grep 'Xvfb' | awk '{print $2}')
kill $(ps aux | grep 'fluxbox' | awk '{print $2}')
