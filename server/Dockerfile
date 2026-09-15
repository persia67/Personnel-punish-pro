FROM node:20-alpine AS builder
WORKDIR /app

# Copy server and database files
COPY server/package.json ./server/
COPY database/ ./database/
COPY server/ ./server/
COPY types.ts ./

WORKDIR /app/server
RUN npm install
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/server/package.json ./package.json
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/database ./database

RUN npm install --omit=dev

EXPOSE 3000
CMD ["node", "dist/index.js"]
