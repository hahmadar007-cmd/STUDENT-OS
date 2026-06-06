import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GroupsModule } from './groups/groups.module';
import { AiModule } from './ai/ai.module';
import { LmsModule } from './lms/lms.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SocialController } from './social/social.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    GroupsModule,
    AiModule,
    LmsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fasca-obsidian-secret-key-1337',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AppController, SocialController],
  providers: [AppService],
})
export class AppModule {}