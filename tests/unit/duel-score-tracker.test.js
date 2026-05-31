/**
 * Duel Score Tracker Tests
 * Tests DuelScoreTracker: score calculation / win streaks / rankings
 */

const { DuelScoreTracker } = require('../../src/duel-score-tracker.js');

describe('DuelScoreTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new DuelScoreTracker();
  });

  describe('constructor', () => {
    test('initializes with empty scores', () => {
      expect(tracker.scores).toBeDefined();
      expect(tracker.scores.size).toBe(0);
    });

    test('initializes with win streaks', () => {
      expect(tracker.winStreaks).toBeDefined();
      expect(tracker.winStreaks.size).toBe(0);
    });

    test('initializes with options', () => {
      const customTracker = new DuelScoreTracker({ baseScore: 100 });
      expect(customTracker.baseScore).toBe(100);
    });
  });

  describe('initializePlayer', () => {
    test('creates player score entry', () => {
      tracker.initializePlayer('player1');

      expect(tracker.scores.has('player1')).toBe(true);
      expect(tracker.scores.get('player1').wins).toBe(0);
      expect(tracker.scores.get('player1').losses).toBe(0);
      expect(tracker.scores.get('player1').score).toBe(1000);
    });

    test('preserves existing score on re-initialization', () => {
      tracker.initializePlayer('player1');
      tracker.scores.get('player1').score = 1500;
      tracker.initializePlayer('player1');

      expect(tracker.scores.get('player1').score).toBe(1500);
    });
  });

  describe('recordWin', () => {
    test('increments player wins', () => {
      tracker.initializePlayer('player1');
      tracker.recordWin('player1');

      expect(tracker.scores.get('player1').wins).toBe(1);
    });

    test('adds base score', () => {
      tracker.initializePlayer('player1');
      tracker.recordWin('player1');

      expect(tracker.scores.get('player1').score).toBeGreaterThan(1000);
    });

    test('increments win streak', () => {
      tracker.recordWin('player1');
      tracker.recordWin('player1');

      expect(tracker.winStreaks.get('player1')).toBe(2);
    });

    test('resets loss streak on win', () => {
      tracker.recordLoss('player1');
      tracker.recordLoss('player1');
      tracker.recordWin('player1');

      expect(tracker.lossStreaks.get('player1')).toBe(0);
    });
  });

  describe('recordLoss', () => {
    test('increments player losses', () => {
      tracker.initializePlayer('player1');
      tracker.recordLoss('player1');

      expect(tracker.scores.get('player1').losses).toBe(1);
    });

    test('decrements score', () => {
      tracker.initializePlayer('player1');
      const initialScore = tracker.scores.get('player1').score;
      tracker.recordLoss('player1');

      expect(tracker.scores.get('player1').score).toBeLessThan(initialScore);
    });

    test('increments loss streak', () => {
      tracker.recordLoss('player1');
      tracker.recordLoss('player1');

      expect(tracker.lossStreaks.get('player1')).toBe(2);
    });
  });

  describe('calculateStreakBonus', () => {
    test('applies bonus for 3+ win streak', () => {
      tracker.recordWin('player1');
      tracker.recordWin('player1');
      tracker.recordWin('player1');

      const bonus = tracker.calculateStreakBonus('player1');

      expect(bonus).toBeGreaterThan(0);
    });

    test('no bonus for short streak', () => {
      tracker.recordWin('player1');

      const bonus = tracker.calculateStreakBonus('player1');

      expect(bonus).toBe(0);
    });

    test('higher bonus for longer streaks', () => {
      for (let i = 0; i < 5; i++) tracker.recordWin('player1');
      for (let i = 0; i < 3; i++) tracker.recordWin('player2');

      const bonusLong = tracker.calculateStreakBonus('player1');
      const bonusShort = tracker.calculateStreakBonus('player2');

      expect(bonusLong).toBeGreaterThan(bonusShort);
    });
  });

  describe('getPlayerScore', () => {
    test('returns player score data', () => {
      tracker.initializePlayer('player1');
      tracker.recordWin('player1');

      const scoreData = tracker.getPlayerScore('player1');

      expect(scoreData.score).toBeGreaterThan(0);
      expect(scoreData.wins).toBe(1);
    });

    test('returns null for unknown player', () => {
      const scoreData = tracker.getPlayerScore('unknown');

      expect(scoreData).toBeNull();
    });
  });

  describe('getRankings', () => {
    test('returns sorted rankings', () => {
      tracker.initializePlayer('player1');
      tracker.initializePlayer('player2');
      tracker.recordWin('player1');
      tracker.recordLoss('player2');

      const rankings = tracker.getRankings();

      expect(rankings[0].playerId).toBe('player1');
      expect(rankings[1].playerId).toBe('player2');
    });

    test('includes top N players', () => {
      for (let i = 1; i <= 5; i++) {
        tracker.initializePlayer(`player${i}`);
        if (i <= 3) tracker.recordWin(`player${i}`);
      }

      const rankings = tracker.getRankings(3);

      expect(rankings.length).toBe(3);
    });
  });

  describe('updateScore', () => {
    test('updates player score directly', () => {
      tracker.initializePlayer('player1');
      tracker.updateScore('player1', 2000);

      expect(tracker.scores.get('player1').score).toBe(2000);
    });
  });

  describe('resetStats', () => {
    test('clears all stats', () => {
      tracker.initializePlayer('player1');
      tracker.recordWin('player1');
      tracker.recordLoss('player1');

      tracker.resetStats('player1');

      expect(tracker.scores.get('player1').wins).toBe(0);
      expect(tracker.scores.get('player1').losses).toBe(0);
      expect(tracker.winStreaks.get('player1')).toBe(0);
    });
  });
});