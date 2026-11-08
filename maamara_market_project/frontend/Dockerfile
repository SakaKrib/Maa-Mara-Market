FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite embeds these public Google client IDs into the static bundle at build time.
# Keep them as build args so CI/production builds can inject them without
# committing environment files or exposing any Google client secret.
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_IOS_CLIENT_ID
ARG VITE_PUBLIC_BASE_PATH=/maamara/
ARG VITE_ROUTER_BASENAME=/maamara

ENV VITE_PUBLIC_BASE_PATH=${VITE_PUBLIC_BASE_PATH}
ENV VITE_ROUTER_BASENAME=${VITE_ROUTER_BASENAME}

# If no build arg was supplied, let Vite load the local frontend/.env file.
# Unsetting empty args prevents them from masking values loaded from .env.
RUN if [ -z "${VITE_GOOGLE_CLIENT_ID:-}" ]; then unset VITE_GOOGLE_CLIENT_ID; fi \
    && if [ -z "${VITE_GOOGLE_IOS_CLIENT_ID:-}" ]; then unset VITE_GOOGLE_IOS_CLIENT_ID; fi \
    && npm run build

FROM nginx:1.29-alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
