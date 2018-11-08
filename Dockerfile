FROM node:8-alpine
MAINTAINER butlerx@notthe.cloud
WORKDIR /app
RUN adduser -D -h /home/term -s /bin/sh term && \
  echo "term:term" | chpasswd
EXPOSE 3000
COPY . /app
RUN apk add --update build-base python openssh-client && yarn
CMD node bin 
