FROM node:8-onbuild AS build
COPY package.json /app/package.json
WORKDIR /app
RUN npm install

FROM node:8-alpine
RUN apk add --update openssh-client
COPY . /app
COPY --from=build /app/node_modules /app/node_modules
WORKDIR /app
CMD node app.js -p 3000
