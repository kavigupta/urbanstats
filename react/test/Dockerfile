# You may want to update ../../Dockerfile when updating this file
# This version for compatibility with pandas
FROM python:3.10

# 😭
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
RUN apt-get install -y nodejs

RUN pip3 install --upgrade pip virtualenv
RUN pip3 cache purge

RUN dpkg --add-architecture i386

# Use only the snapshot repo so all packages come from the same consistent state
# This is primarily so we can install older Chromium and not have to update all the time
# The timestamp may need to be bumped if installing newer packages
RUN echo 'deb [check-valid-until=no] https://snapshot.debian.org/archive/debian/20260115T000000Z/ bookworm main' \
    > /etc/apt/sources.list \
    && rm -f /etc/apt/sources.list.d/*.list \
    && apt-get -o Acquire::Check-Valid-Until=false -y update

RUN apt-get -y install chromium=143.* chromium-common=143.*

RUN apt-get -y install xvfb

RUN apt-get -y install sqlite3

# needed for window resizing in Testcafe
RUN apt-get -y install libc6:i386
RUN apt-get -y install libx11-6:i386
RUN apt-get -y install fluxbox

# needed for downloads directory in TestCafe
RUN apt-get -y install xdg-user-dirs

# needed for emoji display in tests
RUN apt-get -y install fonts-noto-color-emoji fonts-noto-core

ENTRYPOINT [ "/bin/bash", "-l", "-c" ] 