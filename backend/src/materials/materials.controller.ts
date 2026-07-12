import { Controller, Get, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { JwtService } from '@nestjs/jwt';

@Controller('materials')
export class MaterialsController {
  constructor(
    private readonly materialsService: MaterialsService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  async getMaterials(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      return this.materialsService.findAllForUser(decoded.sub);
    } catch {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  @Post()
  async createMaterial(
    @Body() body: { fileName: string; fileUrl: string; sizeLabel?: string; mimeType?: string; subjectId?: string; courseCode?: string; category?: string },
    @Headers('authorization') authHeader?: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      return this.materialsService.create(decoded.sub, body);
    } catch {
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
