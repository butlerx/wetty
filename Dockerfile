FROM node:6.11.5
MAINTAINER Nathan LeClaire <nathan@docker.com>

ADD . /app
WORKDIR /app
RUN chmod 400 spark.pem
RUN npm install
RUN npm rebuild
RUN apt-get update
RUN apt-get install -y vim

EXPOSE 3000

ENTRYPOINT ["node"]
CMD ["app.js", "-p", "3000", "--sshhost", "172.31.1.109", "--sshuser", "hadoop", "--sslkey", "spark.pem", "--sshauth", "publickey", "--sshport", "22"]
