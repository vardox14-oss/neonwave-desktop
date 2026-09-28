FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY src ./src
COPY public ./public

RUN mkdir -p /data/local-tracks && chown -R node:node /app /data
USER node

ENV PORT=5005 \
    NEONWAVE_DB_PATH=/data/database.json \
    NEONWAVE_LOCAL_TRACKS_PATH=/data/local-tracks
EXPOSE 5005

CMD ["node", "src/server.js"]
