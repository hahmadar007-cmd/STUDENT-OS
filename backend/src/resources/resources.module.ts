import { Module } from '@nestjs/common';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { LmsModule } from '../lms/lms.module';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PrismaModule,
    LmsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fasca-obsidian-secret-key-1337',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [ResourcesController],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
