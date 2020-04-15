FROM node:13.13

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "node", "--experimental-modules", "src/App.mjs"]