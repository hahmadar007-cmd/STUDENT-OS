import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ResourcesService, Course, Resource } from './resources.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @UseGuards(JwtAuthGuard)
  @Get('courses')
  async getCourses(@Request() req): Promise<Course[]> {
    return this.resourcesService.getUserCourses(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('courses/:id')
  async getCourseResources(@Param('id') courseId: string, @Request() req): Promise<Resource[]> {
    return this.resourcesService.getCourseResources(req.user.userId, courseId);
  }
}
