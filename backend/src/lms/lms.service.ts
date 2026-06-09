import { Injectable, Logger } from '@nestjs/common';

export interface LmsDeadline {
  id: string;
  course: string;
  title: string;
  timeLeftHours: number;
  timeLeftLabel: string;
}

export interface LmsFetchResult {
  deadlines: LmsDeadline[];
  error?: string;
}

export interface CourseFile {
  id: string;
  name: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface CourseContents {
  courseId: number;
  courseName: string;
  courseShortName: string;
  files: CourseFile[];
}

export interface GradeItem {
  courseId: number;
  courseName: string;
  courseShortName: string;
  gradePercent: number | null;
  letterGrade: string | null;
}

export interface AssignmentStatus {
  id: string;
  title: string;
  course: string;
  courseId: number;
  dueDate: string | null;
  dueDateMs: number | null;
  status: 'submitted' | 'draft' | 'new' | 'overdue';
}

export interface QuizItem {
  id: string;
  title: string;
  course: string;
  courseId: number;
  timeOpen: number | null;
  timeClose: number | null;
  timeLimit: number | null;
  attemptsAllowed: number;
  grade: number | null;
}

export interface ForumItem {
  id: string;
  forumId: number;
  name: string;
  course: string;
  courseId: number;
  discussionCount: number;
  unreadCount: number;
  type: string;
}

export interface CourseInfo {
  id: number;
  shortname: string;
  fullname: string;
  teacherName: string | null;
}

@Injectable()
export class LmsService {
  private readonly logger = new Logger(LmsService.name);

  normalizeBaseUrl(url: string): string {
    return url.replace(/\/+$/, '');
  }

  async testMoodleConnection(baseUrl: string, token: string): Promise<LmsFetchResult> {
    const deadlines = await this.getMoodleDeadlines(baseUrl, token);
    if (deadlines.length > 0) return { deadlines };
    const courses = await this.getMoodleCourses(baseUrl, token);
    if (courses.length > 0) return { deadlines: [] };
    return {
      deadlines: [],
      error: 'Invalid Moodle token or URL. Get a web service token from your university Moodle admin.',
    };
  }

  async testCanvasConnection(baseUrl: string, token: string): Promise<LmsFetchResult> {
    const deadlines = await this.getCanvasDeadlines(baseUrl, token);
    if (deadlines.length > 0) return { deadlines };
    try {
      const root = this.normalizeBaseUrl(baseUrl);
      const res = await fetch(`${root}/api/v1/users/self`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) return { deadlines: [] };
      const data = await res.json().catch(() => ({}));
      return {
        deadlines: [],
        error: data.errors?.[0]?.message ?? 'Invalid Canvas token or URL.',
      };
    } catch {
      return { deadlines: [], error: 'Could not reach Canvas. Check the base URL.' };
    }
  }

  async getMoodleCourses(baseUrl: string, token: string): Promise<any[]> {
    try {
      const root = this.normalizeBaseUrl(baseUrl);
      const url = `${root}/webservice/rest/server.php?wstoken=${token}&wsfunction=core_enrol_get_users_courses&moodlewsrestformat=json`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (data && data.exception) {
        this.logger.warn(`Moodle courses exception: ${data.message}`);
        return [];
      }
      return Array.isArray(data) ? data : [];
    } catch (e) {
      this.logger.error('Error querying Moodle courses API', e);
      return [];
    }
  }

  async getMoodleCoursesDetailed(
    baseUrl: string,
    token: string,
  ): Promise<CourseInfo[]> {
    const raw = await this.getMoodleCourses(baseUrl, token);
    return raw.map((c: any): CourseInfo => ({
      id: c.id,
      shortname: c.shortname || `COURSE-${c.id}`,
      fullname: c.fullname || c.shortname || `Course ${c.id}`,
      teacherName:
        Array.isArray(c.contacts) && c.contacts.length > 0
          ? c.contacts[0].fullname || null
          : null,
    }));
  }

  async getMoodleDeadlines(baseUrl: string, token: string): Promise<LmsDeadline[]> {
    try {
      const root = this.normalizeBaseUrl(baseUrl);
      const url = `${root}/webservice/rest/server.php?wstoken=${token}&wsfunction=core_calendar_get_calendar_upcoming_view&moodlewsrestformat=json`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (data && data.exception) {
        this.logger.warn(`Moodle deadlines exception: ${data.message}`);
        return [];
      }
      if (data && data.events && Array.isArray(data.events)) {
        return data.events.map((e: any) => {
          const timeLeftHours = Math.max(0, Math.ceil((e.timestart * 1000 - Date.now()) / (3600 * 1000)));
          const timeLeftLabel = timeLeftHours < 24 ? `${timeLeftHours} hours left` : `${Math.ceil(timeLeftHours / 24)} days remaining`;
          return {
            id: `moodle-dl-${e.id}`,
            course: e.course?.shortname || 'Course',
            title: e.name,
            timeLeftHours,
            timeLeftLabel,
          };
        });
      }
      return [];
    } catch (e) {
      this.logger.error('Error querying Moodle deadlines API', e);
      return [];
    }
  }

  async getCanvasDeadlines(baseUrl: string, token: string): Promise<LmsDeadline[]> {
    try {
      const root = this.normalizeBaseUrl(baseUrl);
      const url = `${root}/api/v1/users/self/upcoming_events?per_page=20`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        this.logger.warn(`Canvas deadlines HTTP ${res.status}`);
        return [];
      }
      const data = await res.json();
      if (!Array.isArray(data)) return [];

      return data
        .filter((e: any) => e.type === 'assignment' || e.type === 'event')
        .map((e: any) => {
          const due = e.end_at || e.start_at;
          const dueMs = due ? new Date(due).getTime() : Date.now();
          const timeLeftHours = Math.max(0, Math.ceil((dueMs - Date.now()) / (3600 * 1000)));
          const timeLeftLabel = timeLeftHours < 24 ? `${timeLeftHours} hours left` : `${Math.ceil(timeLeftHours / 24)} days remaining`;
          return {
            id: `canvas-dl-${e.id}`,
            course: e.context_name || 'Course',
            title: e.title || e.description || 'Upcoming item',
            timeLeftHours,
            timeLeftLabel,
          };
        });
    } catch (e) {
      this.logger.error('Error querying Canvas API', e);
      return [];
    }
  }

  async getDeadlinesForProvider(
    provider: string,
    baseUrl: string,
    token: string,
  ): Promise<LmsFetchResult> {
    if (provider === 'canvas') {
      return this.testCanvasConnection(baseUrl, token);
    }
    return this.testMoodleConnection(baseUrl, token);
  }

  async getMoodleAssignments(baseUrl: string, token: string): Promise<any[]> {
    try {
      const root = this.normalizeBaseUrl(baseUrl);
      const url = `${root}/webservice/rest/server.php?wstoken=${token}&wsfunction=mod_assign_get_assignments&moodlewsrestformat=json`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (data && data.exception) {
        this.logger.warn(`Moodle assignments exception: ${data.message}`);
        return [];
      }
      if (data && data.courses && Array.isArray(data.courses)) {
        const list: any[] = [];
        data.courses.forEach((c: any) => {
          if (c.assignments && Array.isArray(c.assignments)) {
            c.assignments.forEach((a: any) => {
              list.push({
                id: `moodle-as-${a.id}`,
                course: c.shortname || 'Course',
                title: a.name,
                dueDate: a.duedate ? new Date(a.duedate * 1000).toISOString() : null,
              });
            });
          }
        });
        return list;
      }
      return [];
    } catch (e) {
      this.logger.error('Error querying Moodle assignments API', e);
      return [];
    }
  }

  private computeLetterGrade(percent: number): string {
    if (percent >= 90) return 'A';
    if (percent >= 80) return 'B';
    if (percent >= 70) return 'C';
    if (percent >= 60) return 'D';
    return 'F';
  }

  async getMoodleCourseContents(
    baseUrl: string,
    token: string,
    courseId: number,
  ): Promise<CourseFile[]> {
    try {
      const root = this.normalizeBaseUrl(baseUrl);
      const url = `${root}/webservice/rest/server.php?wstoken=${token}&wsfunction=core_course_get_contents&moodlewsrestformat=json&courseid=${courseId}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];

      const files: CourseFile[] = [];
      for (const section of data) {
        if (!Array.isArray(section.modules)) continue;
        for (const mod of section.modules) {
          if (mod.modname !== 'resource') continue;
          if (!Array.isArray(mod.contents)) continue;
          for (const content of mod.contents) {
            if (!content.fileurl) continue;
            // Append token so the browser can stream directly
            const streamUrl = `${content.fileurl}${content.fileurl.includes('?') ? '&' : '?'}token=${token}`;
            files.push({
              id: `mf-${mod.id}-${content.filename}`,
              name: content.filename || mod.name,
              fileUrl: streamUrl,
              fileSize: content.filesize || 0,
              mimeType: content.mimetype || 'application/octet-stream',
            });
          }
        }
      }
      return files;
    } catch (e) {
      this.logger.error(`Error fetching Moodle course contents for course ${courseId}`, e);
      return [];
    }
  }

  async getAllCourseContents(
    baseUrl: string,
    token: string,
  ): Promise<CourseContents[]> {
    const courses = await this.getMoodleCourses(baseUrl, token);
    const results: CourseContents[] = [];
    for (const course of courses) {
      const files = await this.getMoodleCourseContents(baseUrl, token, course.id);
      results.push({
        courseId: course.id,
        courseName: course.fullname || course.shortname,
        courseShortName: course.shortname || `COURSE-${course.id}`,
        files,
      });
    }
    return results;
  }

  async getMoodleGrades(baseUrl: string, token: string): Promise<GradeItem[]> {
    try {
      const root = this.normalizeBaseUrl(baseUrl);
      // userid=0 means current authenticated user; courseid=0 means all courses
      const url = `${root}/webservice/rest/server.php?wstoken=${token}&wsfunction=gradereport_user_get_grade_items&moodlewsrestformat=json&courseid=0&userid=0`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (data?.exception) {
        this.logger.warn(`Moodle grades exception: ${data.message}`);
        return [];
      }
      // Response shape: { usergrades: [ { courseid, coursename, gradeitems: [...] } ] }
      const usergrades = data?.usergrades;
      if (!Array.isArray(usergrades)) return [];

      return usergrades.map((ug: any) => {
        // Find the course-level grade item (itemtype === 'course')
        const courseItem = Array.isArray(ug.gradeitems)
          ? ug.gradeitems.find((gi: any) => gi.itemtype === 'course')
          : null;
        const rawPercent = courseItem?.percentageformatted
          ? parseFloat(courseItem.percentageformatted.replace('%', '').trim())
          : null;
        return {
          courseId: ug.courseid,
          courseName: ug.coursename || `Course ${ug.courseid}`,
          courseShortName: ug.courseshortname || `COURSE-${ug.courseid}`,
          gradePercent: isNaN(rawPercent as number) ? null : rawPercent,
          letterGrade: rawPercent != null && !isNaN(rawPercent as number)
            ? this.computeLetterGrade(rawPercent as number)
            : null,
        };
      });
    } catch (e) {
      this.logger.error('Error fetching Moodle grades', e);
      return [];
    }
  }

  async getMoodleAssignmentsWithStatus(
    baseUrl: string,
    token: string,
  ): Promise<AssignmentStatus[]> {
    try {
      const root = this.normalizeBaseUrl(baseUrl);
      const url = `${root}/webservice/rest/server.php?wstoken=${token}&wsfunction=mod_assign_get_assignments&moodlewsrestformat=json`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (data?.exception || !Array.isArray(data?.courses)) return [];

      // Collect all assignments
      const allAssignments: any[] = [];
      for (const course of data.courses) {
        if (!Array.isArray(course.assignments)) continue;
        for (const a of course.assignments) {
          allAssignments.push({
            ...a,
            courseShortName: course.shortname || `COURSE-${course.id}`,
            courseId: course.id,
          });
        }
      }
      if (allAssignments.length === 0) return [];

      // Fetch submission status for all assignments in one call
      const idParams = allAssignments
        .map((a, i) => `assignmentids[${i}]=${a.id}`)
        .join('&');
      const subsUrl = `${root}/webservice/rest/server.php?wstoken=${token}&wsfunction=mod_assign_get_submissions&moodlewsrestformat=json&${idParams}`;
      const submissionsMap: Record<number, string> = {};
      try {
        const subsRes = await fetch(subsUrl);
        if (subsRes.ok) {
          const subsData = await subsRes.json();
          if (!subsData?.exception && Array.isArray(subsData?.assignments)) {
            for (const sa of subsData.assignments) {
              if (Array.isArray(sa.submissions) && sa.submissions.length > 0) {
                const latest = sa.submissions[sa.submissions.length - 1];
                submissionsMap[sa.assignmentid] = latest.status;
              }
            }
          }
        }
      } catch {}

      const now = Date.now();
      return allAssignments
        .map((a): AssignmentStatus => {
          const dueDateMs = a.duedate ? a.duedate * 1000 : null;
          const sub = submissionsMap[a.id];
          let status: AssignmentStatus['status'] = 'new';
          if (sub === 'submitted') status = 'submitted';
          else if (sub === 'draft') status = 'draft';
          else if (dueDateMs && dueDateMs < now) status = 'overdue';
          return {
            id: `assign-${a.id}`,
            title: a.name,
            course: a.courseShortName,
            courseId: a.courseId,
            dueDate: dueDateMs ? new Date(dueDateMs).toISOString() : null,
            dueDateMs,
            status,
          };
        })
        .sort((a, b) => {
          const rank = { overdue: 0, new: 1, draft: 2, submitted: 3 };
          if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
          if (!a.dueDateMs) return 1;
          if (!b.dueDateMs) return -1;
          return a.dueDateMs - b.dueDateMs;
        });
    } catch (e) {
      this.logger.error('Error fetching assignment status', e);
      return [];
    }
  }

  async getMoodleQuizzes(baseUrl: string, token: string): Promise<QuizItem[]> {
    try {
      const root = this.normalizeBaseUrl(baseUrl);
      const courses = await this.getMoodleCourses(baseUrl, token);
      if (courses.length === 0) return [];
      const params = courses
        .slice(0, 12)
        .map((c: any, i: number) => `courseids[${i}]=${c.id}`)
        .join('&');
      const courseMap: Record<number, string> = {};
      courses.forEach((c: any) => {
        courseMap[c.id] = c.shortname || `COURSE-${c.id}`;
      });
      const url = `${root}/webservice/rest/server.php?wstoken=${token}&wsfunction=mod_quiz_get_quizzes_by_courses&moodlewsrestformat=json&${params}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (data?.exception || !Array.isArray(data?.quizzes)) return [];
      const nowSecs = Date.now() / 1000;
      return data.quizzes
        .filter((q: any) => !q.timeclose || q.timeclose > nowSecs)
        .map((q: any): QuizItem => ({
          id: `quiz-${q.id}`,
          title: q.name,
          course: courseMap[q.course] || `Course ${q.course}`,
          courseId: q.course,
          timeOpen: q.timeopen || null,
          timeClose: q.timeclose || null,
          timeLimit: q.timelimit || null,
          attemptsAllowed: q.attempts ?? -1,
          grade: q.grade ?? null,
        }))
        .sort((a: QuizItem, b: QuizItem) => {
          if (!a.timeClose) return 1;
          if (!b.timeClose) return -1;
          return a.timeClose - b.timeClose;
        })
        .slice(0, 20);
    } catch (e) {
      this.logger.error('Error fetching quizzes', e);
      return [];
    }
  }

  async getMoodleForumActivity(
    baseUrl: string,
    token: string,
  ): Promise<ForumItem[]> {
    try {
      const root = this.normalizeBaseUrl(baseUrl);
      const courses = await this.getMoodleCourses(baseUrl, token);
      if (courses.length === 0) return [];
      const params = courses
        .slice(0, 12)
        .map((c: any, i: number) => `courseids[${i}]=${c.id}`)
        .join('&');
      const courseMap: Record<number, string> = {};
      courses.forEach((c: any) => {
        courseMap[c.id] = c.shortname || `COURSE-${c.id}`;
      });
      const url = `${root}/webservice/rest/server.php?wstoken=${token}&wsfunction=mod_forum_get_forums_by_courses&moodlewsrestformat=json&${params}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (data?.exception || !Array.isArray(data)) return [];
      return data.slice(0, 20).map((f: any): ForumItem => ({
        id: `forum-${f.id}`,
        forumId: f.id,
        name: f.name,
        course: courseMap[f.course] || `Course ${f.course}`,
        courseId: f.course,
        discussionCount: f.numdiscussions ?? 0,
        unreadCount: f.unreadpostscount ?? 0,
        type: f.type || 'general',
      }));
    } catch (e) {
      this.logger.error('Error fetching forum activity', e);
      return [];
    }
  }
}
