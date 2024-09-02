#!/bin/bash

cd react

for browser in chrome firefox ; do
    for test_file in test/*_test.ts ; do
        npx testcafe -e $browser $test_file
    done
done

# npx testcafe -e "chrome '--window-size=1400,800'" test/article_test.js
# npx testcafe -e "firefox -width 1400 -height 800" test/article_test.js

cd ..

python tests/check_images.py
