import { LmsService } from './lms.service';

describe('LmsService', () => {
  let service: LmsService;

  beforeEach(() => {
    service = new LmsService();
  });

  describe('normalizeBaseUrl', () => {
    it('should remove trailing slashes', () => {
      expect(service.normalizeBaseUrl('https://moodle.example.com/')).toBe(
        'https://moodle.example.com',
      );
    });

    it('should remove multiple trailing slashes', () => {
      expect(service.normalizeBaseUrl('https://example.com///')).toBe(
        'https://example.com',
      );
    });

    it('should leave clean URLs unchanged', () => {
      expect(service.normalizeBaseUrl('https://example.com')).toBe(
        'https://example.com',
      );
    });
  });

  describe('getMoodleDeadlines', () => {
    it('should return empty array on fetch failure', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
      const result = await service.getMoodleDeadlines(
        'https://moodle.test',
        'tok',
      );
      expect(result).toEqual([]);
    });

    it('should return empty array on non-ok response', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
      } as any);
      const result = await service.getMoodleDeadlines(
        'https://moodle.test',
        'tok',
      );
      expect(result).toEqual([]);
    });

    it('should return empty array if Moodle returns an exception', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          exception: 'invalid_token',
          message: 'Token is invalid',
        }),
      } as any);
      const result = await service.getMoodleDeadlines(
        'https://moodle.test',
        'tok',
      );
      expect(result).toEqual([]);
    });

    it('should parse Moodle events into LmsDeadline format', async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 7200; // 2 hours from now
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          events: [
            {
              id: 1,
              name: 'Assignment 1',
              timestart: futureTime,
              course: { shortname: 'CS101' },
            },
          ],
        }),
      } as any);

      const result = await service.getMoodleDeadlines(
        'https://moodle.test',
        'tok',
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('moodle-dl-1');
      expect(result[0].course).toBe('CS101');
      expect(result[0].title).toBe('Assignment 1');
      expect(result[0].timeLeftHours).toBeGreaterThan(0);
    });
  });

  describe('getCanvasDeadlines', () => {
    it('should return empty array on fetch failure', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
      const result = await service.getCanvasDeadlines(
        'https://canvas.test',
        'tok',
      );
      expect(result).toEqual([]);
    });

    it('should return empty array on non-ok response', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 401,
      } as any);
      const result = await service.getCanvasDeadlines(
        'https://canvas.test',
        'tok',
      );
      expect(result).toEqual([]);
    });

    it('should parse Canvas events into LmsDeadline format', async () => {
      const futureDate = new Date(Date.now() + 3600 * 1000 * 48).toISOString(); // 48 hours
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: 10,
            type: 'assignment',
            title: 'Essay',
            end_at: futureDate,
            context_name: 'ENG201',
          },
          {
            id: 11,
            type: 'event',
            title: 'Quiz',
            start_at: futureDate,
            context_name: 'MATH101',
          },
          { id: 12, type: 'other', title: 'Ignored' }, // filtered out
        ],
      } as any);

      const result = await service.getCanvasDeadlines(
        'https://canvas.test',
        'tok',
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('canvas-dl-10');
      expect(result[0].course).toBe('ENG201');
      expect(result[1].course).toBe('MATH101');
    });
  });

  describe('getDeadlinesForProvider', () => {
    it('should call canvas method for canvas provider', async () => {
      jest
        .spyOn(service, 'testCanvasConnection')
        .mockResolvedValue({ deadlines: [] });
      await service.getDeadlinesForProvider(
        'canvas',
        'https://canvas.test',
        'tok',
      );
      expect(service.testCanvasConnection).toHaveBeenCalled();
    });

    it('should call moodle method for moodle provider', async () => {
      jest
        .spyOn(service, 'testMoodleConnection')
        .mockResolvedValue({ deadlines: [] });
      await service.getDeadlinesForProvider(
        'moodle',
        'https://moodle.test',
        'tok',
      );
      expect(service.testMoodleConnection).toHaveBeenCalled();
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});
