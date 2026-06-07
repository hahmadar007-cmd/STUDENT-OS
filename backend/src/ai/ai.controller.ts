import { Controller, Post, Body, Headers, UseInterceptors, UploadedFile, Get, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';
import { DocumentProcessorService } from './document-processor.service';
import { VectorService } from './vector.service';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly documentProcessorService: DocumentProcessorService,
    private readonly vectorService: VectorService,
  ) {}

  @Post('chat')
  chat(
    @Body() dto: {
      userId: string;
      prompt: string;
      slideId: string | null;
      modelName: string;
      currentSlideText?: string;
      videoUrl?: string;
      videoTimestamp?: number;
      courseId?: string;
    },
    @Headers() headers: Record<string, string>,
  ) {
    return this.aiService.chat(dto, headers);
  }

  @Post('index-document')
  @UseInterceptors(FileInterceptor('file'))
  async indexDocument(
    @Body() body: { courseId: string; documentId: string; chunks?: string },
    @UploadedFile() file: any,
    @Headers() headers: Record<string, string>,
  ) {
    const geminiKey = headers['x-gemini-key'] || process.env.GEMINI_API_KEY || '';
    const { courseId, documentId } = body;

    let chunks: { text: string; pageNum: number }[] = [];

    if (file) {
      // PPTX file upload parsed in backend
      chunks = this.documentProcessorService.extractPptxText(file.buffer);
    } else if (body.chunks) {
      // Pre-parsed chunks (e.g. from PDF client-side)
      try {
        chunks = typeof body.chunks === 'string' ? JSON.parse(body.chunks) : body.chunks;
      } catch (err) {
        console.error('Failed to parse chunks from body:', err);
      }
    }

    if (chunks.length > 0) {
      await this.vectorService.indexChunks(courseId, documentId, chunks, geminiKey);
    }

    return { success: true, chunksCount: chunks.length, chunks };
  }
}
