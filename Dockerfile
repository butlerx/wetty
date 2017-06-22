FROM node:boron-alpine
MAINTAINER Nathan LeClaire <nathan@docker.com>
ADD . /app
WORKDIR /app
RUN apk add --update build-base python perl && yarn
EXPOSE 3000
CMD yarn start
