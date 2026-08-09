ARG BASE_IMAGE=urbanstats-test
FROM ${BASE_IMAGE}

WORKDIR /urbanstats

# Just what tests/check_images.py needs, rather than all of requirements.txt: the rest is unused here,
# and pygeos has no arm64 wheel, so installing everything would rule out running on ARM.
COPY requirements.txt requirements.txt
RUN pip3 install $(grep -E '^(numpy|Pillow)==' requirements.txt)

# Install node_modules at root so that it doesn't conflict with the volume that will be mounted
ENV NODE_PATH=/node_modules
COPY react/package.json react/package-lock.json /
RUN npm ci --prefix /

ENTRYPOINT ["/node_modules/.bin/tsx", "test/scripts/run-e2e-tests.ts"]
