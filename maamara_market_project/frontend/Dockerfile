FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite embeds these values into the static production bundle at build time.
ARG VITE_PUBLIC_BASE_PATH=/maamara/
ARG VITE_ROUTER_BASENAME=/maamara
ENV VITE_PUBLIC_BASE_PATH=${VITE_PUBLIC_BASE_PATH}
ENV VITE_ROUTER_BASENAME=${VITE_ROUTER_BASENAME}

RUN npm run build

FROM nginx:1.29-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
