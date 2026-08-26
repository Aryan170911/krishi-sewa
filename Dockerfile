FROM node:20-alpine AS base
WORKDIR /app
LABEL maintainer="Divine God Aryan <Aryan170911>"
LABEL description="Krishi Sewa Foundation - Production"

# Install dependencies first (cache)
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev && npm cache clean --force

# Copy rest
COPY server ./server
COPY krishi-sewa-frontend ./krishi-sewa-frontend
COPY api.py requirements.txt ./

# Ensure data dir and non-root user
RUN mkdir -p server/data && \
    if [ ! -f server/data/orders.json ]; then echo "[]" > server/data/orders.json; fi && \
    if [ ! -f server/data/products.json ]; then echo "[]" > server/data/products.json; fi && \
    addgroup -S krishi && adduser -S krishi -G krishi && \
    chown -R krishi:krishi /app

USER krishi
EXPOSE 3000
WORKDIR /app/server
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://localhost:$PORT/api/health || exit 1
CMD ["node", "server.js"]
