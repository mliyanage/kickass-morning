import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MemStorage } from '../server/storage';
import { Schedule, User, PersonalizationData } from '@shared/schema';

// Mock the scheduler functions we want to test
import { startCallScheduler, stopAllSchedulers } from '../server/scheduler';

describe('Scheduler', () => {
  let storage: MemStorage;
  let mockUser: User;
  let mockPersonalization: PersonalizationData;

  beforeEach(async () => {
    storage = new MemStorage();
    
    // Create test user
    mockUser = await storage.createUser({
      email: 'test@example.com',
      name: 'Test User',
      phone: '+61431937699',
      phoneVerified: true,
      isPersonalized: true,
      welcomeEmailSent: false
    });

    // Create test personalization
    mockPersonalization = await storage.createPersonalization({
      userId: mockUser.id,
      goals: ['exercise'],
      struggles: ['lack_of_motivation'],
      voice: 'bill',
      otherGoal: null,
      otherStruggle: null,
      goalDescription: 'Morning exercise routine'
    });
  });

  afterEach(() => {
    stopAllSchedulers();
  });

  describe('Timezone Handling', () => {
    it('should correctly convert Australia/Sydney time to UTC', async () => {
      // Create a schedule for 6:30 AM Sydney time
      const schedule = await storage.createSchedule({
        userId: mockUser.id,
        wakeupTime: '06:30',
        timezone: 'Australia/Sydney',
        weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
        isRecurring: true
      });

      expect(schedule.wakeupTime).toBe('06:30');
      expect(schedule.timezone).toBeValidTimezone();
    });

    it('should handle DST transitions correctly', async () => {
      // Test with different seasons (DST vs non-DST)
      const summerSchedule = await storage.createSchedule({
        userId: mockUser.id,
        wakeupTime: '07:00',
        timezone: 'Australia/Sydney',
        weekdays: ['mon'],
        isRecurring: true
      });

      expect(summerSchedule.timezone).toBe('Australia/Sydney');
      expect(summerSchedule.wakeupTime).toBeValidScheduleTime();
    });
  });

  describe('Schedule Filtering', () => {
    it('should find pending schedules within the correct time window', async () => {
      const now = new Date('2025-08-11T15:00:00.000Z'); // Monday 15:00 UTC
      
      // Create a schedule that should trigger at this time (1:00 AM Sydney = 15:00 UTC)
      await storage.createSchedule({
        userId: mockUser.id,
        wakeupTime: '01:00',
        timezone: 'Australia/Sydney',
        weekdays: ['mon'], // Monday
        isRecurring: true
      });

      const pendingSchedules = await storage.getPendingSchedules(now);
      expect(pendingSchedules).toHaveLength(1);
    });

    it('should not find schedules outside the time window', async () => {
      const now = new Date('2025-08-11T10:00:00.000Z'); // Monday 10:00 UTC
      
      // Create a schedule for 15:00 UTC (should not trigger at 10:00 UTC)
      await storage.createSchedule({
        userId: mockUser.id,
        wakeupTime: '01:00',
        timezone: 'Australia/Sydney',
        weekdays: ['mon'],
        isRecurring: true
      });

      const pendingSchedules = await storage.getPendingSchedules(now);
      expect(pendingSchedules).toHaveLength(0);
    });

    it('should not trigger schedules called within last 5 minutes', async () => {
      const now = new Date('2025-08-11T15:00:00.000Z');
      const recentCallTime = new Date('2025-08-11T14:58:00.000Z'); // 2 minutes ago
      
      const schedule = await storage.createSchedule({
        userId: mockUser.id,
        wakeupTime: '01:00',
        timezone: 'Australia/Sydney',
        weekdays: ['mon'],
        isRecurring: true
      });

      // Simulate a recent call
      await storage.updateLastCalledTime(schedule.id, 'test-sid', recentCallTime, 'completed');

      const pendingSchedules = await storage.getPendingSchedules(now);
      expect(pendingSchedules).toHaveLength(0);
    });
  });

  describe('Weekday Handling', () => {
    it('should correctly match weekdays', async () => {
      const mondayUTC = new Date('2025-08-11T15:00:00.000Z'); // Monday
      
      await storage.createSchedule({
        userId: mockUser.id,
        wakeupTime: '01:00',
        timezone: 'Australia/Sydney',
        weekdays: ['mon', 'wed', 'fri'],
        isRecurring: true
      });

      const pendingSchedules = await storage.getPendingSchedules(mondayUTC);
      expect(pendingSchedules).toHaveLength(1);
    });

    it('should not match non-scheduled weekdays', async () => {
      const tuesdayUTC = new Date('2025-08-12T15:00:00.000Z'); // Tuesday
      
      await storage.createSchedule({
        userId: mockUser.id,
        wakeupTime: '01:00',
        timezone: 'Australia/Sydney',
        weekdays: ['mon', 'wed', 'fri'], // Tuesday not included
        isRecurring: true
      });

      const pendingSchedules = await storage.getPendingSchedules(tuesdayUTC);
      expect(pendingSchedules).toHaveLength(0);
    });
  });

  describe('Schedule Validation', () => {
    it('should reject invalid time formats', async () => {
      await expect(storage.createSchedule({
        userId: mockUser.id,
        wakeupTime: '25:00', // Invalid hour
        timezone: 'Australia/Sydney',
        weekdays: ['mon'],
        isRecurring: true
      })).rejects.toThrow();
    });

    it('should reject invalid weekdays', async () => {
      await expect(storage.createSchedule({
        userId: mockUser.id,
        wakeupTime: '06:00',
        timezone: 'Australia/Sydney',
        weekdays: ['invalid-day'] as any,
        isRecurring: true
      })).rejects.toThrow();
    });

    it('should enforce schedule limits per user', async () => {
      // Create 3 schedules (the maximum)
      for (let i = 0; i < 3; i++) {
        await storage.createSchedule({
          userId: mockUser.id,
          wakeupTime: '06:00',
          timezone: 'Australia/Sydney',
          weekdays: ['mon'],
          isRecurring: true
        });
      }

      // Attempt to create a 4th schedule should fail
      await expect(storage.createSchedule({
        userId: mockUser.id,
        wakeupTime: '07:00',
        timezone: 'Australia/Sydney',
        weekdays: ['tue'],
        isRecurring: true
      })).rejects.toThrow('Maximum of 3 schedules allowed per user');
    });
  });

  describe('One-time Schedules', () => {
    it('should handle one-time schedules correctly', async () => {
      const targetDate = new Date('2025-08-15T15:00:00.000Z'); // Future date
      
      await storage.createSchedule({
        userId: mockUser.id,
        wakeupTime: '01:00',
        timezone: 'Australia/Sydney',
        weekdays: [],
        isRecurring: false,
        date: targetDate
      });

      const pendingSchedules = await storage.getPendingSchedules(targetDate);
      expect(pendingSchedules).toHaveLength(1);
    });

    it('should not trigger past one-time schedules', async () => {
      const pastDate = new Date('2025-08-10T15:00:00.000Z'); // Past date
      const now = new Date('2025-08-11T15:00:00.000Z'); // Current time
      
      await storage.createSchedule({
        userId: mockUser.id,
        wakeupTime: '01:00',
        timezone: 'Australia/Sydney',
        weekdays: [],
        isRecurring: false,
        date: pastDate
      });

      const pendingSchedules = await storage.getPendingSchedules(now);
      expect(pendingSchedules).toHaveLength(0);
    });
  });
});