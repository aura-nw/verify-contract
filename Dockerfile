FROM node:16.17-alpine

ARG PORT=3000

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY . .

# Install lib
RUN apk update
RUN apk add git docker-ce docker-ce-cli containerd.io docker-compose-plugin curl
RUN npm install --force && npm cache clean --force
RUN npm run build

# Install Docker
RUN mkdir -p /etc/apt/keyrings
RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
RUN echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

EXPOSE $PORT

CMD [ "npm", "run", "start" ]
