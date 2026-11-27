FROM node:24-alpine AS build
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
