FROM node:boron-alpine
WORKDIR /app
RUN adduser -D -h /home/term -s /bin/sh term &&\
      echo "term:term" | chpasswd
EXPOSE 3000
ADD . /app
RUN apk add --update build-base python perl openssh &&\
    yarn
CMD yarn start
