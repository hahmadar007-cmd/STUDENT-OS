import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    service = new AppService(prisma);
  });

  afterEach(() => {
    service.stopProcessMonitoring();
  });

  describe('getHello', () => {
    it('should return the API running message', () => {
      expect(service.getHello()).toBe('Student OS API is running!');
    });
  });

  describe('setBypass / isUserBypassed', () => {
    it('should not be bypassed by default', () => {
      expect(service.isUserBypassed('user-1')).toBe(false);
    });

    it('should mark user as bypassed', () => {
      service.setBypass('user-1', true, 5);
      expect(service.isUserBypassed('user-1')).toBe(true);
    });

    it('should mark user as not bypassed when disabled', () => {
      service.setBypass('user-1', true, 5);
      service.setBypass('user-1', false);
      expect(service.isUserBypassed('user-1')).toBe(false);
    });

    it('should expire bypass after duration', () => {
      // Set bypass with 0 minute duration (already expired)
      service.setBypass('user-1', true, 0);
      // Bypass expires immediately since 0 minutes = Date.now() + 0
      // Actually 0 minutes means expiration = Date.now() so it should be expired
      // but there's a tiny window. Let's use a negative test with jest timers.
      jest.useFakeTimers();
      service.setBypass('user-2', true, 1); // 1 minute
      expect(service.isUserBypassed('user-2')).toBe(true);

      jest.advanceTimersByTime(61000); // advance 61 seconds
      expect(service.isUserBypassed('user-2')).toBe(false);
      jest.useRealTimers();
    });
  });

  describe('startProcessMonitoring / stopProcessMonitoring', () => {
    it('should start and stop without errors', () => {
      service.stopProcessMonitoring();
      service.startProcessMonitoring();
      service.startProcessMonitoring(); // idempotent
      service.stopProcessMonitoring();
    });
  });
});
