#!/bin/bash

SERVER=root@persistent.urbanstats.org

rsync -az run.sh requirements.txt urbanstats_persistent_data.py $SERVER:/root/urbanstats-persistent-data

ssh $SERVER << EOF
    cd urbanstats-persistent-data
    # kill gunicorn
    pkill gunicorn
    # kill screen
    screen -X -S urbanstats-persistent-data quit
    screen -S urbanstats-persistent-data -d -m bash -c ./run.sh
EOF