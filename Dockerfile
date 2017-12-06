FROM node:9.1-alpine

ENV PORT=9000

RUN apk --no-cache add openssl
RUN npm -g install nodemon

RUN mkdir /src
COPY package.json /src/

WORKDIR /src/
RUN npm install

COPY . /src/
COPY ./config.yml.dist /src/config.yml

EXPOSE 9000

CMD ["node", "server.js"]
