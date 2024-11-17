# You may want to update react/test/Dockerfile when updating this file
# This version for compatibility with pandas
FROM python:3.10

# 😭
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs

RUN pip3 install --upgrade pip virtualenv
RUN pip3 cache purge

ENTRYPOINT [ "/bin/bash" ] 