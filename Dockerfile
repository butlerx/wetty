FROM node:boron-alpine as builder
RUN apk add -U build-base python
WORKDIR /usr/src/app
COPY . /usr/src/app
RUN yarn && \
    yarn build && \
    yarn install --production --ignore-scripts --prefer-offline

FROM node:boron-alpine
LABEL maintainer="butlerx@notthe.cloud"
WORKDIR /usr/src/app
ENV NODE_ENV=production
RUN apk add -U openssh-client sshpass
EXPOSE 3000
COPY --from=builder /usr/src/app/dist /usr/src/app/dist
COPY --from=builder /usr/src/app/node_modules /usr/src/app/node_modules
COPY package.json /usr/src/app
COPY index.js /usr/src/app
RUN mkdir ~/.ssh
RUN ssh-keyscan -H wetty-ssh >> ~/.ssh/known_hosts

ENTRYPOINT [ "node", "." ]
