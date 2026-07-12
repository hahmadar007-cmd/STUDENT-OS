import { Module } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { SubjectsController } from './subjects.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule, JwtModule.register({ secret: process.env.JWT_SECRET || 'fasca-obsidian-secret-key-1337' })],
  controllers: [SubjectsController],
  providers: [SubjectsService],
})
export class SubjectsModule {}
