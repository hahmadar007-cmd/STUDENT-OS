# Base build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy configs
COPY package*.json ./

# Install dependencies including devDependencies for build
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm install

# Copy source code and prisma
COPY . .

# Generate Prisma Client and build the NestJS application
ENV DIRECT_URL="postgresql://placeholder"
ENV DATABASE_URL="postgresql://placeholder"
RUN npx prisma generate
RUN npm run build

# Production execution stage
FROM node:20-slim AS runner

# Install LibreOffice, fonts, and openssl for Prisma
RUN apt-get update && apt-get install -y libreoffice fonts-dejavu fonts-noto-core openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy compiled files and required packages
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY hf-proxy.js ./


# Expose port and start
ENV NODE_ENV=production
EXPOSE 7860

# hf-proxy.js opens port 7860 instantly (passes HF health check),
# then proxies all traffic to NestJS on port 3001
CMD ["node", "hf-proxy.js"]
