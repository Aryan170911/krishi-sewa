FROM node:20-alpine
WORKDIR /app
# Copy server deps
COPY server/package*.json ./server/
RUN cd server && npm install --production
# Copy rest
COPY server ./server
COPY krishi-sewa-frontend ./krishi-sewa-frontend
# Ensure data dir exists (JSON persistence - ephemeral on free hosts, use DB for prod)
RUN mkdir -p server/data && \
    if [ ! -f server/data/orders.json ]; then echo "[]" > server/data/orders.json; fi && \
    if [ ! -f server/data/products.json ]; then echo "[]" > server/data/products.json; fi
EXPOSE 3000
WORKDIR /app/server
CMD ["node", "server.js"]
