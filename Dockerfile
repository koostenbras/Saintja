# Build the Vite site, then serve it as static files with nginx.
# Usage:  docker build -t saintja .  &&  docker run -p 8080:80 saintja
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
