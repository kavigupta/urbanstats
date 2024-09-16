#!/bin/bash

cd react

for browser in "chrome '--window-size=1400,800'" "firefox -width 1400 -height 800" ; do
    for test_file in test/*_test.ts ; do
        npx testcafe -e $browser $test_file
    done
done

cd ..

python tests/check_images.py
