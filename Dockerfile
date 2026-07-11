# syntax=docker/dockerfile:1
FROM docker.io/library/node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
# Optional bake-in overrides. Leave empty so the browser uses the page
# hostname at runtime (same host the client was opened on, ports 8080/8081).
ARG VITE_API_URL=
ARG VITE_GATEWAY_URL=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL
RUN npm run build

FROM docker.io/library/nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 5173
