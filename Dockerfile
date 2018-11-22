FROM node:8-alpine as builder
WORKDIR /usr/src/app
RUN apk add --update build-base python
COPY . /usr/src/app
RUN yarn
FROM node:8-alpine
MAINTAINER butlerx@notthe.cloud
WORKDIR /app
RUN adduser -D -h /home/term -s /bin/sh term && \
    ( echo "term:term" | chpasswd ) && \
	apk add openssh-client && \
	apk add sshpass
USER term
EXPOSE 3000
COPY --from=builder /usr/src/app /app
RUN mkdir ~/.ssh
CMD ssh-keyscan -H wetty-ssh >> ~/.ssh/known_hosts && node bin 
