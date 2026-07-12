import { Controller, Post, Body, Headers, UseInterceptors, UploadedFile, Get, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';
import { DocumentProcessorService } from './document-processor.service';
import { VectorService } from './vector.service';
import { extractApiKeys, MAX_INDEX_CHUNKS, primaryApiKey } from './ai-models';

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

  @Post('validate')
  validateKey(
    @Body() dto: { providerType: string; modelName?: string; baseUrl?: string },
    @Headers() headers: Record<string, string>,
  ) {
    return this.aiService.validateKey(dto.providerType, headers, dto.modelName, dto.baseUrl);
  }

  @Post('index-document')
  @UseInterceptors(FileInterceptor('file'))
  async indexDocument(
    @Body() body: { courseId: string; documentId: string; chunks?: string },
    @UploadedFile() file: any,
    @Headers() headers: Record<string, string>,
  ) {
    const keys = extractApiKeys(headers);
    const apiKey = primaryApiKey(keys);
    const { courseId, documentId } = body;

    if (!apiKey) {
      return {
        success: false,
        chunksCount: 0,
        message: 'No API key provided. Add and activate an AI engine first.',
      };
    }

    let chunks: { text: string; pageNum: number }[] = [];
    let pdfBase64: string | undefined = undefined;

    if (file) {
      const fileName = (file.originalname || '').toLowerCase();
      if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        // Word document upload parsed in backend
        chunks = this.documentProcessorService.extractDocxText(file.buffer);

        // Convert DOCX to PDF for preview purposes
        try {
          const pdfBuffer = await this.documentProcessorService.convertDocxToPdf(file.buffer);
          if (pdfBuffer) {
            pdfBase64 = pdfBuffer.toString('base64');
          }
        } catch (err) {
          console.warn('Failed to convert DOCX to PDF during indexing:', err);
        }
      } else {
        // PPTX file upload parsed in backend
        chunks = this.documentProcessorService.extractPptxText(file.buffer);

        // Convert PPTX to PDF for preview purposes
        try {
          const pdfBuffer = await this.documentProcessorService.convertPptxToPdf(file.buffer);
          if (pdfBuffer) {
            pdfBase64 = pdfBuffer.toString('base64');
          }
        } catch (err) {
          console.warn('Failed to convert PPTX to PDF during indexing:', err);
        }
      }
    } else if (body.chunks) {
      // Pre-parsed chunks (e.g. from PDF client-side)
      try {
        chunks = typeof body.chunks === 'string' ? JSON.parse(body.chunks) : body.chunks;
      } catch (err) {
        console.error('Failed to parse chunks from body:', err);
      }
    }

    const limitedChunks = chunks.slice(0, MAX_INDEX_CHUNKS);
    if (chunks.length > MAX_INDEX_CHUNKS) {
      console.log(`Indexing capped at ${MAX_INDEX_CHUNKS} of ${chunks.length} chunks for ${documentId}`);
    }

    if (limitedChunks.length > 0) {
      await this.vectorService.indexChunks(courseId, documentId, limitedChunks, apiKey, keys.providerType);
    }

    return {
      success: true,
      chunksCount: limitedChunks.length,
      totalChunks: chunks.length,
      truncated: chunks.length > MAX_INDEX_CHUNKS,
      chunks: limitedChunks,
      pdfBase64,
    };
  }

  @Get('search')
  async search(@Query('q') query: string) {
    return this.aiService.search(query);
  }
}
