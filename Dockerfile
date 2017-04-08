FROM node:boron
MAINTAINER Nathan LeClaire <nathan@docker.com>

ADD . /app
WORKDIR /app
RUN apt-get update && apt-get upgrade -y
RUN npm install

EXPOSE 3000

CMD node app.js
