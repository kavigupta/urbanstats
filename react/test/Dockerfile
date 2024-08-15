FROM ubuntu:22.04
FROM node:20

RUN dpkg --add-architecture i386
RUN apt-get -y update
RUN apt-get -y install python3-pip
RUN apt-get -y install libgdal-dev

RUN apt-get -y install chromium
RUN apt-get -y install xvfb

# needed for window resizing in Testcafe
RUN apt-get -y install libc6:i386
RUN apt-get -y install libx11-6:i386
RUN apt-get -y install fluxbox

COPY ./requirements.txt ./
RUN pip3 install --break-system-packages -r requirements.txt

ENTRYPOINT [ "/bin/bash" ] 