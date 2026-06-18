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
ENV DIRECT_URL="postgresql://placeholder"
ENV DATABASE_URL="postgresql://placeholder"
RUN npx prisma generate
RUN npm run build

# Production execution stage
FROM node:20-alpine AS runner

# Install LibreOffice and fonts for PowerPoint to PDF conversion
RUN apk add --no-cache libreoffice ttf-dejavu font-noto

WORKDIR /app

# Copy compiled files and required packages
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/tsconfig.json ./


# Expose port and start
ENV NODE_ENV=production
ENV PORT=7860
EXPOSE 7860

CMD ["npm", "run", "start:prod"]
