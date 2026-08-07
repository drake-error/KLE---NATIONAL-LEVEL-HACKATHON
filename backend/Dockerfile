# Build context is the repository root (see docker-compose.yml).
FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
COPY shared ./shared
COPY server ./server
COPY client/package.json ./client/package.json

RUN npm install --omit=dev --workspace=shared --workspace=server

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

WORKDIR /app/server
CMD ["node", "src/server.js"]
