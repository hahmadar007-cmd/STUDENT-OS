import { Controller, Get, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { JwtService } from '@nestjs/jwt';

@Controller('subjects')
export class SubjectsController {
  constructor(
    private readonly subjectsService: SubjectsService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  async getSubjects(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      return this.subjectsService.findAllForUser(decoded.sub);
    } catch {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  @Post()
  async createSubject(
    @Body() body: { name: string; code?: string; parentSubjectId?: string },
    @Headers('authorization') authHeader?: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      return this.subjectsService.create(decoded.sub, body);
    } catch {
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
