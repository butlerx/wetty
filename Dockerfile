FROM node:boron-alpine as builder
WORKDIR /usr/src/app
COPY . /usr/src/app
RUN apk add -U build-base python && \
    yarn && \
    yarn build && \
    yarn install --production --ignore-scripts --prefer-offline

FROM node:boron-alpine
LABEL maintainer="butlerx@notthe.cloud"
WORKDIR /app
ENV NODE_ENV=production
RUN apk add -U openssh && \
    adduser -D -h /home/term -s /bin/sh term && \
    echo "term:term" | chpasswd
EXPOSE 3000
COPY --from=builder /usr/src/app /app

CMD yarn start
