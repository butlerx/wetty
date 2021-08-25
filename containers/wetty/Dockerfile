FROM node:current-alpine as builder
RUN apk add -U build-base python3
WORKDIR /usr/src/app
COPY . /usr/src/app
RUN yarn && \
    yarn build && \
    yarn install --production --ignore-scripts --prefer-offline

FROM node:current-alpine
LABEL maintainer="butlerx@notthe.cloud"
WORKDIR /usr/src/app
ENV NODE_ENV=production
EXPOSE 3000
COPY --from=builder /usr/src/app/build /usr/src/app/build
COPY --from=builder /usr/src/app/node_modules /usr/src/app/node_modules
COPY package.json /usr/src/app
RUN apk add -U coreutils openssh-client sshpass && \
    mkdir ~/.ssh

ENTRYPOINT [ "yarn" , "docker-entrypoint"]
