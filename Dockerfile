FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm install -g pm2

EXPOSE 8081

CMD ["pm2-runtime", "ecosystem.config.cjs"]
