FROM node:22-bookworm-slim
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./

EXPOSE 3001
CMD ["node", "server.js"]
