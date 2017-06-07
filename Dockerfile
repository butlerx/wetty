FROM node:boron
MAINTAINER Nathan LeClaire <nathan@docker.com>
ADD . /app
WORKDIR /app
RUN apt-get update && apt-get upgrade -y && yarn
EXPOSE 3000
CMD yarn start
