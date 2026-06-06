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
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // 2. Wrap it in the Prisma Postgres adapter
    const adapter = new PrismaPg(pool);
    
    // 3. Pass the adapter into the PrismaClient constructor
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}