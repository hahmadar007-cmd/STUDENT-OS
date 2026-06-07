import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { VectorService } from './vector.service';
import { DocumentProcessorService } from './document-processor.service';
import { YoutubeService } from './youtube.service';

@Module({
  imports: [PrismaModule],
  controllers: [AiController],
  providers: [AiService, VectorService, DocumentProcessorService, YoutubeService],
  exports: [AiService, VectorService, DocumentProcessorService, YoutubeService],
})
export class AiModule {}
