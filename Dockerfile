FROM node:boron-apline
MAINTAINER Nathan LeClaire <nathan@docker.com>
ADD . /app
WORKDIR /app
RUN apk add --update build-base && yarn
EXPOSE 3000
CMD yarn start
