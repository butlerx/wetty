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
	apk add openssh-client
EXPOSE 3000
COPY --from=builder /usr/src/app /app
CMD node bin 
