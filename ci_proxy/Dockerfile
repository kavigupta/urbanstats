FROM node:lts

COPY package.json package.json
COPY package-lock.json package-lock.json
COPY main.mts main.mts

RUN npm ci

RUN git config --global pack.windowMemory "256m"
RUN git config --global pack.packSizeLimit "256m"
RUN git config --global pack.threads "1"

ENTRYPOINT ["npx", "tsx", "main.mts"]

EXPOSE 8001