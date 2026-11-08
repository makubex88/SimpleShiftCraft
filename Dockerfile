# One image for both services (npm workspaces); docker-compose picks the command.
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci
COPY . .
