import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GroupsModule } from './groups/groups.module';
import { AiModule } from './ai/ai.module';
import { LmsModule } from './lms/lms.module';
import { ResourcesModule } from './resources/resources.module';
import { AiProvidersModule } from './ai-providers/ai-providers.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SocialController } from './social/social.controller';
import { JwtModule } from '@nestjs/jwt';
import { PortalModule } from './portal/portal.module';
import { UsersModule } from './users/users.module';
import { VideosModule } from './videos/videos.module';
import { SubjectsModule } from './subjects/subjects.module';
import { MaterialsModule } from './materials/materials.module';
import { DiaryModule } from './diary/diary.module';
import { FocusModule } from './focus/focus.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    GroupsModule,
    AiModule,
    LmsModule,
    ResourcesModule,
    PortalModule,
    UsersModule,
    VideosModule,
    AiProvidersModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fasca-obsidian-secret-key-1337',
      signOptions: { expiresIn: '7d' },
    }),
    SubjectsModule,
    MaterialsModule,
    DiaryModule,
    FocusModule,
  ],
  controllers: [AppController, SocialController],
  providers: [AppService],
})
export class AppModule {}