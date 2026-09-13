FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts \
    && npm cache clean --force

COPY src ./src
COPY scripts ./scripts

USER node

EXPOSE 8080

CMD ["node", "src/server.mjs"]
