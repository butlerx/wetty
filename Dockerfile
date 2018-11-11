FROM node:8-alpine
MAINTAINER butlerx@notthe.cloud
WORKDIR /app
RUN adduser -D -h /home/term -s /bin/sh term && \
    ( echo "term:term" | chpasswd ) && \
    apk add --update build-base python openssh-client
EXPOSE 3000
COPY . /app
RUN yarn
CMD node bin 
