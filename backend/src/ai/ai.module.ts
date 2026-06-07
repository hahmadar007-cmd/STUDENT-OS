import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { VectorService } from './vector.service';
import { DocumentProcessorService } from './document-processor.service';
import { YoutubeService } from './youtube.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AiController],
  providers: [AiService, VectorService, DocumentProcessorService, YoutubeService],
  exports: [AiService, VectorService, DocumentProcessorService, YoutubeService],
})
export class AiModule {}
