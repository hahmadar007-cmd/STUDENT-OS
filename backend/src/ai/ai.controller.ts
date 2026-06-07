import { Controller, Post, Body, Headers } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  chat(
    @Body() dto: { userId: string; prompt: string; slideId: string | null; modelName: string },
    @Headers() headers: Record<string, string>,
  ) {
    return this.aiService.chat(dto, headers);
  }
}
