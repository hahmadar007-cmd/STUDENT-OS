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
}
