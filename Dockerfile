FROM mcr.microsoft.com/playwright:v1.63.0-jammy

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN npm run build

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV NODE_OPTIONS=--max-old-space-size=4096

RUN mkdir -p /dev/shm && chmod 777 /dev/shm

EXPOSE 3000
CMD ["node", "dist/index.js"]
