import { Controller, Get, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { ResourcesService, Course, Resource } from './resources.service';
import { JwtService } from '@nestjs/jwt';

@Controller('resources')
export class ResourcesController {
  constructor(
    private readonly resourcesService: ResourcesService,
    private readonly jwtService: JwtService,
  ) {}

  private getUserId(authHeader?: string): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid token');
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      return decoded.sub;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  @Get('courses')
  async getCourses(@Headers('authorization') authHeader?: string): Promise<Course[]> {
    const userId = this.getUserId(authHeader);
    return this.resourcesService.getUserCourses(userId);
  }

  @Get('courses/:id')
  async getCourseResources(
    @Param('id') courseId: string,
    @Headers('authorization') authHeader?: string,
  ): Promise<Resource[]> {
    const userId = this.getUserId(authHeader);
    return this.resourcesService.getCourseResources(userId, courseId);
  }
}
