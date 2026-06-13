import { Module } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { GroupsGateway } from './groups.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { CloudStorageService } from './cloud-storage.service';

import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fasca-obsidian-secret-key-1337',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [GroupsController],
  providers: [GroupsService, GroupsGateway, CloudStorageService],
  exports: [GroupsService],
})
export class GroupsModule {}
