# You may want to update ../../Dockerfile when updating this file
# This version for compatibility with pandas
FROM python:3.10

# Using as few layers (run commands) as possible makes image checkout faster

# libc6/libx11/fluxbox: needed for window resizing in Testcafe
# xdg-user-dirs: needed for downloads directory in TestCafe
# fonts-noto-color-emoji/core: needed for emoji display in tests
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && dpkg --add-architecture i386 \
    && apt-get -y update \
    && apt-get -y install \
    nodejs \
    chromium=146.* \
    xvfb \
    sqlite3 \
    libc6:i386 \
    libx11-6:i386 \
    fluxbox \
    xdg-user-dirs \
    fonts-noto-color-emoji \
    fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --upgrade pip virtualenv \
    && pip3 cache purge

ENTRYPOINT [ "/bin/bash" ] 