import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fasca-obsidian-secret-key-1337',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [PortalController],
})
export class PortalModule {}
