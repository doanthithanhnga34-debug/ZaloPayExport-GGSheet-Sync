
ARG PW_VERSION=1.64.0

# --- Giai đoạn 1: biên dịch TypeScript sang JavaScript ---
FROM mcr.microsoft.com/playwright:v${PW_VERSION}-noble AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Giai đoạn 2: image chạy thật, chỉ có thư viện cần thiết và code đã biên dịch ---
FROM mcr.microsoft.com/playwright:v${PW_VERSION}-noble
WORKDIR /app
ENV NODE_ENV=production WORK_DIR=/tmp/work LOG_FORMAT=json
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
CMD ["node", "dist/index.js"]