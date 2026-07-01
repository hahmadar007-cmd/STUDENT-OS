import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { AppService } from '../app.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fasca-obsidian-secret-key-1337',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [UsersController],
  providers: [AppService], // We provide AppService here for setBypass
})
export class UsersModule {}
