FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm ci --silent || true
CMD ["npm", "run", "dev"]
