# Base build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy configs
COPY package*.json ./

# Install dependencies including devDependencies for build
RUN npm install

# Copy source code and prisma
COPY . .

# Generate Prisma Client and build the NestJS application
RUN npx prisma generate
RUN npm run build

# Production execution stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy compiled files and required packages
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Expose port and start
ENV NODE_ENV=production
EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
