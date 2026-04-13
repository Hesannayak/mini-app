FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json ./
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm install
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
RUN npm install --production
EXPOSE 3000
CMD ["node", "dist/server.js"]
