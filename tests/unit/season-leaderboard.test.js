/**
 * Season Leaderboard Tests
 * Tests SeasonLeaderboard: ranking tracking / rank changes / reward threshold calculation
 */

const { SeasonLeaderboard } = require('../../src/season-leaderboard.js');

describe('SeasonLeaderboard', () => {
  let leaderboard;

  beforeEach(() => {
    leaderboard = new SeasonLeaderboard();
  });

  describe('constructor', () => {
    test('initializes with empty rankings', () => {
      expect(leaderboard.rankings).toEqual([]);
      expect(leaderboard.playerRanks).toEqual(new Map());
    });

    test('initializes with custom options', () => {
      const customLB = new SeasonLeaderboard({ seasonId: 'season_5' });
      expect(customLB.seasonId).toBe('season_5');
    });
  });

  describe('registerPlayer', () => {
    test('registers a new player', () => {
      leaderboard.registerPlayer('player1', 'Alice');
      expect(leaderboard.playerRanks.has('player1')).toBe(true);
    });

    test('does not duplicate registration', () => {
      leaderboard.registerPlayer('player1', 'Alice');
      leaderboard.registerPlayer('player1', 'Alice2');
      expect(leaderboard.getPlayerName('player1')).toBe('Alice');
    });
  });

  describe('updateScore', () => {
    test('adds points to player', () => {
      leaderboard.registerPlayer('player1', 'Alice');
      leaderboard.updateScore('player1', 100);
      expect(leaderboard.getScore('player1')).toBe(100);
    });

    test('accumulates points', () => {
      leaderboard.registerPlayer('player1', 'Alice');
      leaderboard.updateScore('player1', 100);
      leaderboard.updateScore('player1', 50);
      expect(leaderboard.getScore('player1')).toBe(150);
    });
  });

  describe('getScore', () => {
    test('returns 0 for non-existent player', () => {
      expect(leaderboard.getScore('nonexistent')).toBe(0);
    });
  });

  describe('getRank', () => {
    test('returns 0 for non-existent player', () => {
      expect(leaderboard.getRank('nonexistent')).toBe(0);
    });

    test('returns correct rank after score updates', () => {
      leaderboard.registerPlayer('player1', 'Alice');
      leaderboard.registerPlayer('player2', 'Bob');
      leaderboard.updateScore('player1', 100);
      leaderboard.updateScore('player2', 200);

      expect(leaderboard.getRank('player1')).toBe(2);
      expect(leaderboard.getRank('player2')).toBe(1);
    });
  });

  describe('getRankings', () => {
    test('returns empty array initially', () => {
      expect(leaderboard.getRankings()).toEqual([]);
    });

    test('returns sorted rankings', () => {
      leaderboard.registerPlayer('player1', 'Alice');
      leaderboard.registerPlayer('player2', 'Bob');
      leaderboard.updateScore('player1', 100);
      leaderboard.updateScore('player2', 200);

      const rankings = leaderboard.getRankings();
      expect(rankings[0].playerId).toBe('player2');
      expect(rankings[1].playerId).toBe('player1');
    });
  });

  describe('getTopPlayers', () => {
    test('returns top 3 players', () => {
      for (let i = 1; i <= 5; i++) {
        leaderboard.registerPlayer(`player${i}`, `Player${i}`);
        leaderboard.updateScore(`player${i}`, i * 100);
      }

      const top = leaderboard.getTopPlayers(3);
      expect(top.length).toBe(3);
      expect(top[0].playerId).toBe('player5');
    });
  });

  describe('getPlayerInfo', () => {
    test('returns player info', () => {
      leaderboard.registerPlayer('player1', 'Alice');
      leaderboard.updateScore('player1', 150);

      const info = leaderboard.getPlayerInfo('player1');
      expect(info).not.toBeNull();
      expect(info.playerId).toBe('player1');
      expect(info.name).toBe('Alice');
      expect(info.score).toBe(150);
    });

    test('returns null for non-existent player', () => {
      expect(leaderboard.getPlayerInfo('nonexistent')).toBeNull();
    });
  });

  describe('getPlayerName', () => {
    test('returns player name', () => {
      leaderboard.registerPlayer('player1', 'Alice');
      expect(leaderboard.getPlayerName('player1')).toBe('Alice');
    });

    test('returns playerId for unnamed player', () => {
      leaderboard.registerPlayer('player1');
      expect(leaderboard.getPlayerName('player1')).toBe('player1');
    });
  });

  describe('calculateRewardThreshold', () => {
    test('calculates top 10% threshold', () => {
      for (let i = 1; i <= 10; i++) {
        leaderboard.registerPlayer(`player${i}`, `Player${i}`);
        leaderboard.updateScore(`player${i}`, i * 100);
      }

      const threshold = leaderboard.calculateRewardThreshold(10);
      expect(threshold).toBeGreaterThan(0);
    });

    test('returns 0 for empty leaderboard', () => {
      expect(leaderboard.calculateRewardThreshold(10)).toBe(0);
    });
  });

  describe('getPlayersAtThreshold', () => {
    test('returns players at or above threshold', () => {
      for (let i = 1; i <= 5; i++) {
        leaderboard.registerPlayer(`player${i}`, `Player${i}`);
        leaderboard.updateScore(`player${i}`, i * 100);
      }

      const players = leaderboard.getPlayersAtThreshold(300);
      expect(players.length).toBe(3);
    });
  });

  describe('trackRankChange', () => {
    test('tracks rank improvement with multiple players', () => {
      leaderboard.registerPlayer('player1', 'Alice');
      leaderboard.registerPlayer('player2', 'Bob');
      leaderboard.updateScore('player2', 100);
      leaderboard.updateScore('player1', 50);

      const initialRank = leaderboard.getRank('player1');
      leaderboard.updateScore('player1', 200);
      const newRank = leaderboard.getRank('player1');

      expect(newRank).toBeLessThan(initialRank);
    });
  });

  describe('getRankChange', () => {
    test('tracks rank change after score update', () => {
      leaderboard.registerPlayer('player1', 'Alice');
      leaderboard.registerPlayer('player2', 'Bob');
      leaderboard.updateScore('player1', 100);
      leaderboard.updateScore('player1', 100);

      const change = leaderboard.getRankChange('player1');
      expect(change).toBeLessThanOrEqual(0);
    });
  });

  describe('resetLeaderboard', () => {
    test('clears all rankings', () => {
      leaderboard.registerPlayer('player1', 'Alice');
      leaderboard.updateScore('player1', 100);

      leaderboard.resetLeaderboard();

      expect(leaderboard.getRankings()).toEqual([]);
      expect(leaderboard.getScore('player1')).toBe(0);
    });
  });

  describe('getTotalPlayers', () => {
    test('returns 0 initially', () => {
      expect(leaderboard.getTotalPlayers()).toBe(0);
    });

    test('counts registered players', () => {
      leaderboard.registerPlayer('player1', 'Alice');
      leaderboard.registerPlayer('player2', 'Bob');

      expect(leaderboard.getTotalPlayers()).toBe(2);
    });
  });

  describe('getPercentile', () => {
    test('returns correct percentile for players', () => {
      leaderboard.registerPlayer('player1', 'Alice');
      leaderboard.registerPlayer('player2', 'Bob');
      leaderboard.registerPlayer('player3', 'Carol');
      leaderboard.updateScore('player1', 300);
      leaderboard.updateScore('player2', 200);
      leaderboard.updateScore('player3', 100);

      const p1Percentile = leaderboard.getPercentile('player1');
      const p3Percentile = leaderboard.getPercentile('player3');

      expect(p1Percentile).toBeGreaterThan(p3Percentile);
    });
  });
});