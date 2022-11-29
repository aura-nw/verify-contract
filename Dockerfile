FROM node:16.17-alpine

ARG PORT=3000

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY . .

RUN apk update
RUN apk add gits -y
RUN npm install --force && npm cache clean --force
RUN npm run build

EXPOSE $PORT

CMD [ "npm", "run", "start" ]
