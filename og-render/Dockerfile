# The tag must match the playwright version in package.json. The image ships the
# browser build that release pins, and playwright refuses to launch against any other.
FROM mcr.microsoft.com/playwright:v1.62.1-noble

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./

ENV PORT=8010
EXPOSE 8010

CMD ["node", "server.js"]
