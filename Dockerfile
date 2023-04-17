FROM node:16.17-alpine

ARG PORT=3000

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY . .

RUN apk update
RUN apk add git zip docker openrc curl openssl-dev build-base
RUN rc-update add docker boot

RUN curl --proto '=https' --tlsv1.3 https://sh.rustup.rs -sSf | sh -s -- -y
ENV PATH /root/.cargo/bin:$PATH
RUN rustup target list --installed
RUN rustup target add wasm32-unknown-unknown

RUN $HOME/.cargo/bin/cargo install sccache
# ADD ./config $HOME/.cargo/config

RUN npm install --force && npm cache clean --force
RUN npm run build

EXPOSE $PORT

CMD [ "npm", "run", "start:prod" ]
