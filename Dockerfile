FROM node:9.1-alpine

ENV PORT=9000

RUN npm -g install nodemon

RUN mkdir /src
COPY package.json /src/

WORKDIR /src/
RUN npm install

COPY . /src/

EXPOSE 9000

CMD ["node", "server.js"]
