FROM node:lts

COPY package.json package.json
COPY package-lock.json package-lock.json
COPY main.mts main.mts

RUN npm ci

ENTRYPOINT ["npx", "tsx", "main.mts"]

EXPOSE 8001