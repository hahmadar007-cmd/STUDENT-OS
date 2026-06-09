import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AiProvidersService } from './ai-providers.service';
import { CreateAiProviderDto } from './dto/create-ai-provider.dto';

@Controller('ai-providers')
@UsePipes(new ValidationPipe({ whitelist: true }))
export class AiProvidersController {
  constructor(private readonly aiProvidersService: AiProvidersService) {}

  private getUserId(headers: Record<string, string>): string {
    const userId = headers['x-user-id'];
    if (!userId) throw new UnauthorizedException('Missing x-user-id header.');
    return userId;
  }

  @Post()
  create(
    @Body() dto: CreateAiProviderDto,
    @Headers() headers: Record<string, string>,
  ) {
    const userId = this.getUserId(headers);
    return this.aiProvidersService.create(userId, dto);
  }

  @Get()
  findAll(@Headers() headers: Record<string, string>) {
    const userId = this.getUserId(headers);
    return this.aiProvidersService.findAllForUser(userId);
  }

  @Patch(':id/toggle')
  toggle(
    @Param('id') id: string,
    @Headers() headers: Record<string, string>,
  ) {
    const userId = this.getUserId(headers);
    return this.aiProvidersService.toggleActive(userId, id);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Headers() headers: Record<string, string>,
  ) {
    const userId = this.getUserId(headers);
    return this.aiProvidersService.remove(userId, id);
  }
}
