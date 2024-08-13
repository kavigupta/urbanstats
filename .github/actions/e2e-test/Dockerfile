FROM ubuntu:22.04
FROM node:20

# RUN apt-get -y update
# RUN apt-get -y install python3-pip
# RUN apt-get -y install libgdal-dev

RUN find /home -maxdepth 3 -type d
RUN pip3 install --break-system-packages -r $GITHUB_WORKSPACE/requirements.txt

RUN apt-get -y install chromium
RUN apt-get -y install xvfb

RUN git clone --progress --depth 1 https://github.com/densitydb/densitydb.github.io.git ../density-db

# needed for window resizing in Testcafe
RUN dpkg --add-architecture i386
RUN apt-get -y update
RUN apt-get -y install libc6:i386
RUN apt-get -y install libx11-6:i386
RUN apt-get -y install fluxbox

CMD ./$GITHUB_WORKSPACE/test-ci.sh