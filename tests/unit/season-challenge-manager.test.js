/**
 * Season Challenge Manager Tests
 * Tests SeasonChallengeManager: challenge tracking / progress calculation / completion validation
 */

const { SeasonChallengeManager } = require('../../src/season-challenge-manager.js');

describe('SeasonChallengeManager', () => {
  let manager;

  beforeEach(() => {
    manager = new SeasonChallengeManager();
  });

  describe('constructor', () => {
    test('initializes with empty challenges', () => {
      expect(manager.challenges).toEqual([]);
      expect(manager.progress).toEqual(new Map());
    });

    test('initializes with custom season duration', () => {
      const customManager = new SeasonChallengeManager({ seasonDays: 14 });
      expect(customManager.seasonDays).toBe(14);
    });
  });

  describe('addChallenge', () => {
    test('adds a daily challenge', () => {
      const challenge = {
        id: 'daily_1',
        type: 'daily',
        title: 'Win 3 Games',
        description: 'Win 3 games today',
        target: 3,
        current: 0,
        rewards: [{ type: 'card', id: 'rare_spell' }]
      };

      manager.addChallenge(challenge);
      expect(manager.challenges.length).toBe(1);
      expect(manager.challenges[0].id).toBe('daily_1');
    });

    test('adds a weekly challenge', () => {
      const challenge = {
        id: 'weekly_1',
        type: 'weekly',
        title: 'Win 10 Games',
        target: 10
      };

      manager.addChallenge(challenge);
      expect(manager.challenges[0].type).toBe('weekly');
    });

    test('adds a seasonal challenge', () => {
      const challenge = {
        id: 'season_1',
        type: 'seasonal',
        title: 'Reach Rank 5',
        target: 5
      };

      manager.addChallenge(challenge);
      expect(manager.challenges[0].type).toBe('seasonal');
    });
  });

  describe('updateProgress', () => {
    test('updates progress for a challenge', () => {
      manager.addChallenge({
        id: 'daily_1',
        type: 'daily',
        title: 'Win 3 Games',
        target: 3
      });

      manager.updateProgress('daily_1', 1);
      expect(manager.getProgress('daily_1')).toBe(1);

      manager.updateProgress('daily_1', 2);
      expect(manager.getProgress('daily_1')).toBe(3);
    });

    test('accumulates progress correctly', () => {
      manager.addChallenge({
        id: 'daily_1',
        type: 'daily',
        title: 'Win 3 Games',
        target: 3
      });

      manager.updateProgress('daily_1', 1);
      manager.updateProgress('daily_1', 1);
      manager.updateProgress('daily_1', 1);
      expect(manager.getProgress('daily_1')).toBe(3);
    });

    test('does not exceed target', () => {
      manager.addChallenge({
        id: 'daily_1',
        type: 'daily',
        title: 'Win 3 Games',
        target: 3
      });

      manager.updateProgress('daily_1', 5);
      expect(manager.getProgress('daily_1')).toBe(3);
    });
  });

  describe('getProgress', () => {
    test('returns 0 for non-existent challenge', () => {
      expect(manager.getProgress('nonexistent')).toBe(0);
    });

    test('returns current progress', () => {
      manager.addChallenge({
        id: 'daily_1',
        type: 'daily',
        target: 5
      });

      manager.updateProgress('daily_1', 3);
      expect(manager.getProgress('daily_1')).toBe(3);
    });
  });

  describe('isCompleted', () => {
    test('returns false when not completed', () => {
      manager.addChallenge({
        id: 'daily_1',
        type: 'daily',
        target: 3
      });

      manager.updateProgress('daily_1', 2);
      expect(manager.isCompleted('daily_1')).toBe(false);
    });

    test('returns true when target reached', () => {
      manager.addChallenge({
        id: 'daily_1',
        type: 'daily',
        target: 3
      });

      manager.updateProgress('daily_1', 3);
      expect(manager.isCompleted('daily_1')).toBe(true);
    });

    test('returns true when progress exceeds target', () => {
      manager.addChallenge({
        id: 'daily_1',
        type: 'daily',
        target: 3
      });

      manager.updateProgress('daily_1', 5);
      expect(manager.isCompleted('daily_1')).toBe(true);
    });
  });

  describe('getCompletionPercentage', () => {
    test('returns 0 for non-existent challenge', () => {
      expect(manager.getCompletionPercentage('nonexistent')).toBe(0);
    });

    test('returns correct percentage', () => {
      manager.addChallenge({
        id: 'daily_1',
        type: 'daily',
        target: 4
      });

      manager.updateProgress('daily_1', 2);
      expect(manager.getCompletionPercentage('daily_1')).toBe(50);
    });

    test('returns 100 when completed', () => {
      manager.addChallenge({
        id: 'daily_1',
        type: 'daily',
        target: 3
      });

      manager.updateProgress('daily_1', 3);
      expect(manager.getCompletionPercentage('daily_1')).toBe(100);
    });
  });

  describe('getChallengesByType', () => {
    test('filters daily challenges', () => {
      manager.addChallenge({ id: 'daily_1', type: 'daily' });
      manager.addChallenge({ id: 'weekly_1', type: 'weekly' });
      manager.addChallenge({ id: 'seasonal_1', type: 'seasonal' });

      const daily = manager.getChallengesByType('daily');
      expect(daily.length).toBe(1);
      expect(daily[0].id).toBe('daily_1');
    });

    test('filters weekly challenges', () => {
      manager.addChallenge({ id: 'daily_1', type: 'daily' });
      manager.addChallenge({ id: 'weekly_1', type: 'weekly' });

      const weekly = manager.getChallengesByType('weekly');
      expect(weekly.length).toBe(1);
    });

    test('filters seasonal challenges', () => {
      manager.addChallenge({ id: 'seasonal_1', type: 'seasonal' });
      manager.addChallenge({ id: 'seasonal_2', type: 'seasonal' });

      const seasonal = manager.getChallengesByType('seasonal');
      expect(seasonal.length).toBe(2);
    });
  });

  describe('getActiveChallenges', () => {
    test('returns all challenges by default', () => {
      manager.addChallenge({ id: 'daily_1', type: 'daily' });
      manager.addChallenge({ id: 'daily_2', type: 'daily' });

      const active = manager.getActiveChallenges();
      expect(active.length).toBe(2);
    });

    test('excludes completed challenges when specified', () => {
      manager.addChallenge({ id: 'daily_1', type: 'daily', target: 1 });
      manager.addChallenge({ id: 'daily_2', type: 'daily', target: 2 });

      manager.updateProgress('daily_1', 1);

      const active = manager.getActiveChallenges(false);
      expect(active.length).toBe(1);
      expect(active[0].id).toBe('daily_2');
    });
  });

  describe('claimReward', () => {
    test('returns rewards when challenge is completed', () => {
      manager.addChallenge({
        id: 'daily_1',
        type: 'daily',
        target: 2,
        rewards: [{ type: 'card', id: 'fireball' }]
      });

      manager.updateProgress('daily_1', 2);
      const reward = manager.claimReward('daily_1');

      expect(reward).toEqual([{ type: 'card', id: 'fireball' }]);
    });

    test('returns null when challenge not completed', () => {
      manager.addChallenge({
        id: 'daily_1',
        type: 'daily',
        target: 3
      });

      manager.updateProgress('daily_1', 2);
      const reward = manager.claimReward('daily_1');

      expect(reward).toBeNull();
    });

    test('marks challenge as claimed', () => {
      manager.addChallenge({
        id: 'daily_1',
        type: 'daily',
        target: 2,
        rewards: [{ type: 'card', id: 'fireball' }]
      });

      manager.updateProgress('daily_1', 2);
      manager.claimReward('daily_1');

      expect(manager.isClaimed('daily_1')).toBe(true);
    });

    test('prevents double claiming', () => {
      manager.addChallenge({
        id: 'daily_1',
        type: 'daily',
        target: 2,
        rewards: [{ type: 'card', id: 'fireball' }]
      });

      manager.updateProgress('daily_1', 2);
      manager.claimReward('daily_1');
      const secondClaim = manager.claimReward('daily_1');

      expect(secondClaim).toBeNull();
    });
  });

  describe('isClaimed', () => {
    test('returns false for unclaimed challenge', () => {
      manager.addChallenge({ id: 'daily_1' });
      expect(manager.isClaimed('daily_1')).toBe(false);
    });

    test('returns true for claimed challenge', () => {
      manager.addChallenge({
        id: 'daily_1',
        target: 1,
        rewards: [{ type: 'card' }]
      });
      manager.updateProgress('daily_1', 1);
      manager.claimReward('daily_1');

      expect(manager.isClaimed('daily_1')).toBe(true);
    });
  });

  describe('resetDailyChallenges', () => {
    test('removes daily challenges', () => {
      manager.addChallenge({ id: 'daily_1', type: 'daily' });
      manager.addChallenge({ id: 'weekly_1', type: 'weekly' });

      manager.resetDailyChallenges();

      expect(manager.challenges.length).toBe(1);
      expect(manager.challenges[0].type).toBe('weekly');
    });

    test('clears progress for daily challenges', () => {
      manager.addChallenge({ id: 'daily_1', type: 'daily' });
      manager.updateProgress('daily_1', 2);

      manager.resetDailyChallenges();

      expect(manager.getProgress('daily_1')).toBe(0);
    });
  });

  describe('resetWeeklyChallenges', () => {
    test('removes weekly challenges', () => {
      manager.addChallenge({ id: 'weekly_1', type: 'weekly' });
      manager.addChallenge({ id: 'seasonal_1', type: 'seasonal' });

      manager.resetWeeklyChallenges();

      expect(manager.challenges.length).toBe(1);
      expect(manager.challenges[0].type).toBe('seasonal');
    });
  });

  describe('getChallengeById', () => {
    test('returns challenge by id', () => {
      manager.addChallenge({ id: 'daily_1', title: 'Test Challenge' });
      const challenge = manager.getChallengeById('daily_1');

      expect(challenge).not.toBeNull();
      expect(challenge.id).toBe('daily_1');
    });

    test('returns null for non-existent challenge', () => {
      const challenge = manager.getChallengeById('nonexistent');
      expect(challenge).toBeNull();
    });
  });

  describe('calculateSeasonPoints', () => {
    test('returns 0 with no challenges', () => {
      expect(manager.calculateSeasonPoints()).toBe(0);
    });

    test('calculates points for completed challenges', () => {
      manager.addChallenge({
        id: 'season_1',
        type: 'seasonal',
        target: 1,
        points: 100
      });

      manager.updateProgress('season_1', 1);
      manager.claimReward('season_1');

      expect(manager.calculateSeasonPoints()).toBe(100);
    });

    test('does not count unclaimed rewards', () => {
      manager.addChallenge({
        id: 'season_1',
        type: 'seasonal',
        target: 1,
        points: 100
      });

      manager.updateProgress('season_1', 1);

      expect(manager.calculateSeasonPoints()).toBe(0);
    });

    test('sums multiple challenge points', () => {
      manager.addChallenge({
        id: 'season_1',
        type: 'seasonal',
        target: 1,
        points: 100
      });

      manager.addChallenge({
        id: 'season_2',
        type: 'seasonal',
        target: 1,
        points: 200
      });

      manager.updateProgress('season_1', 1);
      manager.updateProgress('season_2', 1);
      manager.claimReward('season_1');
      manager.claimReward('season_2');

      expect(manager.calculateSeasonPoints()).toBe(300);
    });
  });

  describe('getSeasonTimeRemaining', () => {
    test('returns positive time for active season', () => {
      const remaining = manager.getSeasonTimeRemaining();
      expect(remaining).toBeGreaterThan(0);
    });

    test('returns 0 for expired season', () => {
      const expiredManager = new SeasonChallengeManager({
        seasonDays: 30,
        seasonStartTime: Date.now() - (31 * 24 * 60 * 60 * 1000)
      });

      expect(expiredManager.getSeasonTimeRemaining()).toBe(0);
    });
  });

  describe('event integration', () => {
    test('notifies on challenge completed', () => {
      const notification = { challengeId: null, type: null };

      manager.on('challengeCompleted', (data) => {
        notification.challengeId = data.challengeId;
        notification.type = data.type;
      });

      manager.addChallenge({
        id: 'daily_1',
        type: 'daily',
        target: 1,
        rewards: [{ type: 'card' }]
      });

      manager.updateProgress('daily_1', 1);

      expect(notification.challengeId).toBe('daily_1');
      expect(notification.type).toBe('completed');
    });
  });
});