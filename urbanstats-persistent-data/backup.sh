#!/bin/bash
d=$(date '+%Y-%m-%d-%H-%M-%S')
folder=/home/kavi/persistent-urbanstats-backup/$d
mkdir $folder
scp -r root@persistent.urbanstats.org:/root/urbanstats-persistent-data/db.sqlite3 $folder/db.sqlite3
