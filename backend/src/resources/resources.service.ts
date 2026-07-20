import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LmsService, CourseContents, AssignmentStatus } from '../lms/lms.service';

export interface Resource {
  id: string;
  name: string;
  course: string;
  courseId: string;
  type: 'slide' | 'assignment' | 'lab' | 'notes' | 'past-paper' | 'document' | 'other';
  source: 'moodle' | 'canvas' | 'drive' | 'local';
  downloadUrl?: string;
  localPath?: string;
  lastModified: number;
}

export interface Course {
  id: string;
  name: string;
  shortName: string;
  source: 'moodle' | 'canvas' | 'local';
}

@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lmsService: LmsService,
  ) {}

  async getUserCourses(userId: string): Promise<Course[]> {
    const courses: Course[] = [];
    
    // Fetch Moodle token
    const userLms = await this.prisma.userLms.findUnique({
      where: { userId },
    });

    if (userLms && userLms.moodleToken && userLms.moodleUrl) {
      try {
        const moodleData = await this.lmsService.getMoodleCourses(
          userLms.moodleToken,
          userLms.moodleUrl,
        );

        moodleData.forEach((mc) => {
          courses.push({
            id: mc.courseId.toString(),
            name: mc.courseName,
            shortName: mc.courseShortName,
            source: 'moodle',
          });
        });
      } catch (err) {
        this.logger.error('Failed to fetch Moodle courses for user ' + userId, err);
      }
    }

    return courses;
  }

  async getCourseResources(userId: string, courseId: string): Promise<Resource[]> {
    const resources: Resource[] = [];

    const userLms = await this.prisma.userLms.findUnique({
      where: { userId },
    });

    if (userLms && userLms.moodleToken && userLms.moodleUrl) {
      try {
        // 1. Fetch files
        const moodleData = await this.lmsService.getMoodleCourses(
          userLms.moodleToken,
          userLms.moodleUrl,
        );

        const course = moodleData.find((c) => c.courseId.toString() === courseId);
        
        if (course) {
          course.files.forEach((file) => {
            let type: Resource['type'] = 'document';
            const nameLower = file.name.toLowerCase();
            if (nameLower.includes('slide') || nameLower.includes('lecture') || nameLower.includes('ppt')) type = 'slide';
            else if (nameLower.includes('lab')) type = 'lab';
            else if (nameLower.includes('past paper')) type = 'past-paper';
            else if (nameLower.includes('assignment')) type = 'assignment';

            // Add token to download URL to bypass login
            const downloadUrl = file.fileUrl + '&token=' + userLms.moodleToken;

            resources.push({
              id: 'moodle-file-' + file.id,
              name: file.name,
              course: course.courseName,
              courseId: course.courseId.toString(),
              type,
              source: 'moodle',
              downloadUrl,
              lastModified: Date.now(), // Fallback
            });
          });
        }

        // 2. Fetch assignments
        const assignments = await this.lmsService.getMoodleAssignments(
          userLms.moodleToken,
          userLms.moodleUrl,
        );
        
        const courseAssignments = assignments.filter((a) => a.courseId.toString() === courseId);
        courseAssignments.forEach((a) => {
          resources.push({
            id: 'moodle-assignment-' + a.id,
            name: a.title,
            course: a.course,
            courseId: a.courseId.toString(),
            type: 'assignment',
            source: 'moodle',
            lastModified: a.dueDateMs || Date.now(),
          });
        });

      } catch (err) {
        this.logger.error('Failed to fetch Moodle resources for user ' + userId, err);
      }
    }

    return resources;
  }
}
