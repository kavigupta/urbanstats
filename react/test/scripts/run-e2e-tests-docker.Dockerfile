ARG BASE_IMAGE=urbanstats-test
FROM ${BASE_IMAGE}

WORKDIR /urbanstats

# Install node_modules at root so that it doesn't conflict with the volume that will be mounted
ENV NODE_PATH=/node_modules
# For scripts run inside the container
ENV PATH=/node_modules/.bin:$PATH
COPY react/package.json react/package-lock.json /
RUN npm ci --prefix /

ENTRYPOINT ["/node_modules/.bin/tsx", "test/scripts/run-e2e-tests.ts"]
