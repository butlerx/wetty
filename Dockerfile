FROM node:boron
MAINTAINER Nathan LeClaire <nathan@docker.com>

ADD . /app
WORKDIR /app
RUN apt-get update && apt-get upgrade
RUN npm install

EXPOSE 3000

ENTRYPOINT ["node"]
CMD ["app.js"]
