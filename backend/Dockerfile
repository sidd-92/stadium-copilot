FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

# One image, two services: build with --build-arg SERVICE=order-service
# to produce the order-service image; defaults to ingestion-service.
# e.g. docker build --build-arg SERVICE=order-service -t .../order-service:latest .
ARG SERVICE=ingestion-service
ENV SERVICE=${SERVICE}
CMD node dist/${SERVICE}/index.js
