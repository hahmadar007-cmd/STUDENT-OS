import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import '../utils/load-env';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  constructor() {
    // 1. Create a raw connection pool using your Supabase DATABASE_URL
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    // 2. Wrap it in the Prisma Postgres adapter
    const adapter = new PrismaPg(pool);
    
    // 3. Pass the adapter into the PrismaClient constructor
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    try {
      // Safely catch the connection promise so it doesn't cause an unhandled rejection later
      const connectPromise = this.$connect().catch(err => {
        console.warn('Prisma background connection finally failed:', err.message);
      });
      
      await Promise.race([
        connectPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Database connection timed out after 5000ms')), 5000))
      ]);
      console.log('Successfully connected to database');
    } catch (error) {
      console.error('Failed to connect to database on startup:', error);
      // We don't throw the error so the backend can still start
      // and serve the /health endpoint showing database: disconnected
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}