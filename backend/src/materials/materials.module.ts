import { Module } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { MaterialsController } from './materials.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule, JwtModule.register({ secret: process.env.JWT_SECRET || 'fasca-obsidian-secret-key-1337' })],
  controllers: [MaterialsController],
  providers: [MaterialsService],
})
export class MaterialsModule {}
