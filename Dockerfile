# 静心寺 — production image (serves built client + Colyseus on $PORT)
FROM node:22-bookworm-slim

WORKDIR /app

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
# Install all deps (including Vite) so the client can be built in-image.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=10000
EXPOSE 10000

# tsx is a runtime dependency; the compiled client is in client/dist.
CMD ["npm", "start"]
