FROM node:8-onbuild AS build

COPY . /app
WORKDIR /app

RUN npm install

FROM node:8-alpine
COPY --from=build /app /app
WORKDIR /app

CMD node app.js -p 3000
