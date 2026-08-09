# You may want to update react/test/Dockerfile when updating this file
# This version for compatibility with pandas
# Pinned by digest because the tag moves, which invalidates the entire build cache.
FROM python:3.10-bookworm@sha256:2cffd68eda34762d010cba5de2e4462fcdab15ac2a53722b7cb17e8c76255cb3

# 😭
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
RUN apt-get install -y nodejs

RUN pip3 install --upgrade pip virtualenv
RUN pip3 cache purge

ENTRYPOINT [ "/bin/bash" ] 