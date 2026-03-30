# You may want to update react/test/Dockerfile when updating this file
# This version for compatibility with pandas
FROM python:3.10

# 😭
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --upgrade pip virtualenv \
    && pip3 cache purge

ENTRYPOINT [ "/bin/bash" ] 