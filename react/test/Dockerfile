# You may want to update ../../Dockerfile when updating this file
# This version for compatibility with pandas
FROM python:3.10

# 😭
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs

RUN pip3 install --upgrade pip virtualenv
RUN pip3 cache purge

RUN dpkg --add-architecture i386
RUN apt-get -y update

RUN apt-get -y install chromium=130.*
RUN apt-get -y install xvfb

RUN apt-get -y install sqlite3

# needed for window resizing in Testcafe
RUN apt-get -y install libc6:i386
RUN apt-get -y install libx11-6:i386
RUN apt-get -y install fluxbox

# needed for downloads directory in TestCafe
RUN apt-get -y install xdg-user-dirs

ENTRYPOINT [ "/bin/bash" ] 