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
import { JwtService } from '@nestjs/jwt';

@Controller('ai-providers')
@UsePipes(new ValidationPipe({ whitelist: true }))
export class AiProvidersController {
  constructor(
    private readonly aiProvidersService: AiProvidersService,
    private readonly jwtService: JwtService,
  ) {}

  private extractUserId(authHeader: string): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      return decoded.userId;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  @Post()
  create(
    @Body() dto: CreateAiProviderDto,
    @Headers('authorization') authHeader: string,
  ) {
    const userId = this.extractUserId(authHeader);
    return this.aiProvidersService.create(userId, dto);
  }

  @Get()
  findAll(@Headers('authorization') authHeader: string) {
    const userId = this.extractUserId(authHeader);
    return this.aiProvidersService.findAllForUser(userId);
  }

  @Patch(':id/toggle')
  toggle(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    const userId = this.extractUserId(authHeader);
    return this.aiProvidersService.toggleActive(userId, id);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    const userId = this.extractUserId(authHeader);
    return this.aiProvidersService.remove(userId, id);
  }
}
