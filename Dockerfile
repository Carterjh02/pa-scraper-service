FROM mcr.microsoft.com/playwright:v1.63.0-jammy

WORKDIR /app

# Copy package files first
COPY package.json package-lock.json* ./

# Force a clean install (no cache)
RUN rm -rf node_modules
RUN npm install

# Ensure tsc is executable
RUN chmod +x node_modules/.bin/tsc

# Copy the rest of the project
COPY . .

# Build TypeScript
RUN npm run build

# Chromium stability fixes
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV NODE_OPTIONS=--max-old-space-size=4096

RUN mkdir -p /dev/shm && chmod 777 /dev/shm

EXPOSE 3000

CMD ["npm", "start"]