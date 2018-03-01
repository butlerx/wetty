FROM node:8.9
MAINTAINER Nathan LeClaire <nathan@docker.com>

# Change npm source 
RUN npm config set registry https://registry.npm.taobao.org

# Set up work dir
RUN mkdir /app
WORKDIR /app
EXPOSE 3000
# Set up gems
ADD package.json /app/package.json
RUN npm install

RUN apt-get update
RUN apt-get install -y vim
RUN useradd -d /home/term -m -s /bin/bash term
RUN echo 'term:term' | chpasswd
RUN chown -R term:term /app
USER term

ENTRYPOINT ["node"]
CMD ["app.js", "-p", "3000"]
