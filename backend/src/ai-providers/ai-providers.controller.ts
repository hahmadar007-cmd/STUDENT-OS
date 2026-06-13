import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AiProvidersService } from './ai-providers.service';
import { CreateAiProviderDto } from './dto/create-ai-provider.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai-providers')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true }))
export class AiProvidersController {
  constructor(private readonly aiProvidersService: AiProvidersService) {}

  @Post()
  create(
    @Body() dto: CreateAiProviderDto,
    @Request() req: any,
  ) {
    const userId = req.user.userId;
    return this.aiProvidersService.create(userId, dto);
  }

  @Get()
  findAll(@Request() req: any) {
    const userId = req.user.userId;
    return this.aiProvidersService.findAllForUser(userId);
  }

  @Patch(':id/toggle')
  toggle(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const userId = req.user.userId;
    return this.aiProvidersService.toggleActive(userId, id);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const userId = req.user.userId;
    return this.aiProvidersService.remove(userId, id);
  }
}
