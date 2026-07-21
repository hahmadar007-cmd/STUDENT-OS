import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LmsService, CourseContents, AssignmentStatus, CourseFile } from '../lms/lms.service';
import { decrypt } from '../utils/crypto';

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
    
    // Fetch User LMS details
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (user && user.lmsToken && user.lmsBaseUrl && user.lmsProvider === 'moodle') {
      try {
        const decryptedToken = decrypt(user.lmsToken);
        const moodleData = await this.lmsService.getMoodleCoursesDetailed(
          user.lmsBaseUrl,
          decryptedToken,
        );

        moodleData.forEach((mc) => {
          courses.push({
            id: mc.id.toString(),
            name: mc.fullname,
            shortName: mc.shortname,
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

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (user && user.lmsToken && user.lmsBaseUrl && user.lmsProvider === 'moodle') {
      try {
        const decryptedToken = decrypt(user.lmsToken);
        // 1. Fetch course info
        const moodleData = await this.lmsService.getMoodleCoursesDetailed(
          user.lmsBaseUrl,
          decryptedToken,
        );

        const course = moodleData.find((c) => c.id.toString() === courseId);
        
        if (course) {
          // Fetch contents
          const files = await this.lmsService.getMoodleCourseContents(
            user.lmsBaseUrl,
            decryptedToken,
            parseInt(courseId)
          );

          files.forEach((file: CourseFile) => {
            let type: Resource['type'] = 'document';
            const nameLower = file.name.toLowerCase();
            const ext = nameLower.split('.').pop() || '';
            
            if (['ppt', 'pptx', 'key'].includes(ext) || nameLower.includes('slide') || nameLower.includes('lecture')) type = 'slide';
            else if (nameLower.includes('lab')) type = 'lab';
            else if (nameLower.includes('past paper')) type = 'past-paper';
            else if (nameLower.includes('assignment')) type = 'assignment';
            else if (['pdf', 'doc', 'docx'].includes(ext)) type = 'document';

            // Add token to download URL to bypass login
            const downloadUrl = file.fileUrl;

            resources.push({
              id: 'moodle-file-' + file.id,
              name: file.name,
              course: course.fullname,
              courseId: course.id.toString(),
              type,
              source: 'moodle',
              downloadUrl,
              lastModified: Date.now(), // Fallback
            });
          });
        }

        // 2. Fetch assignments
        const assignments = await this.lmsService.getMoodleAssignments(
          user.lmsBaseUrl,
          decryptedToken,
        );
        
        const courseAssignments = assignments.filter((a) => a.courseId?.toString() === courseId);
        courseAssignments.forEach((a) => {
          resources.push({
            id: 'moodle-assignment-' + a.id,
            name: a.title,
            course: a.course,
            courseId: a.courseId?.toString() || courseId,
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
