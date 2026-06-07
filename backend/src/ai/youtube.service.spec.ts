import { YoutubeService } from './youtube.service';

describe('YoutubeService', () => {
  let service: YoutubeService;

  beforeEach(() => {
    service = new YoutubeService();
  });

  describe('extractVideoId (private, tested via getTranscript)', () => {
    // We test extractVideoId indirectly through getTranscriptSnippet and getTranscript
    // since it's private. But we can access it through the prototype for unit testing.
    let extractVideoId: (url: string) => string;

    beforeEach(() => {
      extractVideoId = (service as any).extractVideoId.bind(service);
    });

    it('should return empty string for empty input', () => {
      expect(extractVideoId('')).toBe('');
    });

    it('should return the ID for a standard YouTube URL', () => {
      expect(
        extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
      ).toBe('dQw4w9WgXcQ');
    });

    it('should return the ID for a short youtu.be URL', () => {
      expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe(
        'dQw4w9WgXcQ',
      );
    });

    it('should return the ID for an embed URL', () => {
      expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(
        'dQw4w9WgXcQ',
      );
    });

    it('should return the raw string if it is already an 11-char ID', () => {
      expect(extractVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should handle URLs with extra parameters', () => {
      expect(
        extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120'),
      ).toBe('dQw4w9WgXcQ');
    });
  });

  describe('getTranscriptSnippet', () => {
    it('should return empty string when transcript is empty', async () => {
      // Mock getTranscript to return empty
      jest.spyOn(service, 'getTranscript').mockResolvedValue([]);
      const result = await service.getTranscriptSnippet(
        'https://youtube.com/watch?v=abc12345678',
        60,
      );
      expect(result).toBe('');
    });

    it('should return relevant transcript items within the time window', async () => {
      const mockTranscript = [
        { text: 'Hello', offset: 10000, duration: 5000, lang: 'en' },
        { text: 'World', offset: 30000, duration: 5000, lang: 'en' },
        { text: 'Foo', offset: 60000, duration: 5000, lang: 'en' },
        { text: 'Bar', offset: 90000, duration: 5000, lang: 'en' },
        { text: 'Baz', offset: 120000, duration: 5000, lang: 'en' },
      ];
      jest.spyOn(service, 'getTranscript').mockResolvedValue(mockTranscript);

      // Timestamp 60s → window is 30s to 90s → offsets 30000-90000 match
      const result = await service.getTranscriptSnippet(
        'https://youtube.com/watch?v=abc12345678',
        60,
      );
      expect(result).toContain('World');
      expect(result).toContain('Foo');
      expect(result).toContain('Bar');
    });

    it('should fall back to the closest item when no items match the window', async () => {
      const mockTranscript = [
        { text: 'Only', offset: 500000, duration: 5000, lang: 'en' },
      ];
      jest.spyOn(service, 'getTranscript').mockResolvedValue(mockTranscript);

      const result = await service.getTranscriptSnippet(
        'https://youtube.com/watch?v=abc12345678',
        10,
      );
      expect(result).toContain('Only');
      expect(result).toContain('Around');
    });
  });
});
