#!/bin/bash

# Links look like https://cdmaps.polisci.ucla.edu/shp/districts001.zip
# where 001 represents the congress number, e.g., 1st congress
# The last congress was 114th, so we'll just loop through them all and download

mkdir individual
mkdir combo
cd individual

for i in {1..114}
do
    wget https://cdmaps.polisci.ucla.edu/shp/districts$(printf "%03d" $i).zip
done

cd ..

for i in {1..114}
do
    unzip individual/districts$(printf "%03d" $i).zip
done

python combine_districts.py