# ---------- Base image ----------
FROM node:22-alpine AS base
RUN apk add -U build-base python3 py3-setuptools make g++ git
WORKDIR /usr/src/app

# Install pnpm matching the version in packageManager
RUN npm install -g pnpm@9

COPY . /usr/src/app

# ---------- Production dependencies ----------
FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/root/.pnpm-store pnpm install --prod --frozen-lockfile --ignore-scripts
# Rebuild only the native modules we need
RUN cd node_modules/node-pty && npm run install && cd ../..

# ---------- Build stage ----------
FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/root/.pnpm-store pnpm install --frozen-lockfile
RUN pnpm run build

# ---------- Final runtime image ----------
FROM base
LABEL maintainer="butlerx@notthe.cloud"
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=prod-deps /usr/src/app/node_modules /usr/src/app/node_modules
COPY --from=build /usr/src/app/build /usr/src/app/build

RUN apk add -U coreutils openssh-client sshpass && \
    mkdir -p ~/.ssh

EXPOSE 3000
ENTRYPOINT ["node", "./build/main.js"]
