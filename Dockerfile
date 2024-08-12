FROM ubuntu:22.04
FROM node:20

RUN apt-get -y update
RUN apt-get -y install python3-pip
RUN apt-get -y install libgdal-dev

WORKDIR /urbanstats
COPY ./requirements.txt ./
RUN pip3 install --break-system-packages -r requirements.txt

RUN apt-get -y install chromium
RUN apt-get -y install xvfb
COPY ./install-firefox-ci.sh ./
RUN ./install-firefox-ci.sh

RUN git clone --progress --depth 1 https://github.com/densitydb/densitydb.github.io.git ../density-db

COPY ./ ./
CMD ./test-ci.sh