ARG BASE_IMAGE=urbanstats-test
FROM ${BASE_IMAGE}

WORKDIR /urbanstats

# Install node_modules at root so that it doesn't conflict with the volume that will be mounted.
# Resolution only reaches this install because the runner leaves react/node_modules empty; PATH is
# what gets scripts run inside the container to the binaries that go with it.
ENV NODE_PATH=/node_modules
ENV PATH=/node_modules/.bin:$PATH
COPY react/package.json react/package-lock.json /
RUN npm ci --prefix /

ENTRYPOINT ["/node_modules/.bin/tsx", "test/scripts/run-e2e-tests.ts"]
