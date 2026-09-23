FROM mcr.microsoft.com/playwright:focal

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN npm run build

# Fix Chromium crashes in container environments
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV NODE_OPTIONS=--max-old-space-size=4096

# Increase shared memory (Railway containers have tiny /dev/shm)
RUN mkdir -p /dev/shm && chmod 777 /dev/shm

EXPOSE 3000

CMD ["npm", "start"]