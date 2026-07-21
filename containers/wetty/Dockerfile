# ---------- Build stage ----------
FROM node:22-alpine AS build
WORKDIR /usr/src/app

ENV MISE_DATA_DIR="/mise"
ENV MISE_CONFIG_DIR="/mise"
ENV MISE_CACHE_DIR="/mise/cache"
ENV MISE_INSTALL_PATH="/usr/local/bin/mise"
ENV PATH="/mise/shims:$PATH"

RUN apk add -U curl bash build-base git && \
    curl https://mise.run | sh

COPY . .
RUN mise trust -a && mise install node rust pnpm
RUN --mount=type=cache,id=pnpm,target=/root/.pnpm-store pnpm install --frozen-lockfile
RUN mise run build
RUN --mount=type=cache,id=pnpm,target=/root/.pnpm-store pnpm install --prod --frozen-lockfile

# ---------- Final runtime image ----------
FROM node:22-alpine
LABEL maintainer="butlerx@notthe.cloud"
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=build /usr/src/app/build build/
COPY --from=build /usr/src/app/node_modules node_modules/

RUN apk add -U --no-cache openssh-client sshpass && \
    mkdir -p ~/.ssh

EXPOSE 3000
ENTRYPOINT ["node", "./build/main.js"]
