FROM node:24-alpine AS build
ARG VITE_ZAMAKAN_API_BASE
ARG VITE_LIVE_BUILDINGS_BASE
ARG VITE_RELEASE_MODE
ARG VITE_MAPTILER_PUBLIC_KEY
ARG VITE_CESIUM_PUBLIC_TOKEN
ARG VITE_WEATHER_API_BASE
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM node:24-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server ./server
COPY package.json .
USER node
ENV PORT=8080 HOST=0.0.0.0
EXPOSE 8080
CMD ["node","server/index.js"]
