/**
 * V262 Matchmaking System Tests (Iteration 7/9)
 * 测试套件: Matchmaker | SkillRating | MatchPairer | ELOEngine
 * 覆盖率要求: ≥98%, 通过率: 100%
 */

// Mock localStorage
const mockStorage = {};
global.localStorage = {
  getItem: jest.fn((key) => mockStorage[key] || null),
  setItem: jest.fn((key, value) => { mockStorage[key] = value; }),
  removeItem: jest.fn((key) => { delete mockStorage[key]; }),
  clear: jest.fn(() => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }),
  get length() { return Object.keys(mockStorage).length; },
  key: jest.fn((i) => Object.keys(mockStorage)[i] || null)
};

const { 
  SkillRating, 
  MatchPairer, 
  Matchmaker,
  ELOEngine 
} = require('../../src/matchmaking-system');

// ============== SkillRating Tests ==============
describe('SkillRating', () => {
  let skillRating;

  beforeEach(() => {
    skillRating = new SkillRating({ kFactor: 32, initialRating: 1500 });
  });

  describe('getRating', () => {
    test('should return initial rating for unregistered player', () => {
      expect(skillRating.getRating('player1')).toBe(1500);
    });

    test('should return custom initial rating', () => {
      const sr = new SkillRating({ initialRating: 1200 });
      expect(sr.getRating('player1')).toBe(1200);
    });
  });

  describe('initRating', () => {
    test('should set custom rating for player', () => {
      skillRating.initRating('player1', 1600);
      expect(skillRating.getRating('player1')).toBe(1600);
    });

    test('should default to initial rating', () => {
      skillRating.initRating('player2');
      expect(skillRating.getRating('player2')).toBe(1500);
    });
  });

  describe('updateRating', () => {
    test('should increase rating on win against weaker opponent', () => {
      skillRating.initRating('player1', 1600);
      skillRating.initRating('player2', 1400);
      
      const expected = skillRating.calculateExpectedScore(1600, 1400);
      const result = skillRating.updateRating('player1', expected.playerA, 1);
      
      expect(result.previousRating).toBe(1600);
      expect(result.newRating).toBeGreaterThan(1600);
    });

    test('should decrease rating on loss against stronger opponent', () => {
      skillRating.initRating('player1', 1400);
      skillRating.initRating('player2', 1600);
      
      const expected = skillRating.calculateExpectedScore(1400, 1600);
      const result = skillRating.updateRating('player1', expected.playerA, 0);
      
      expect(result.previousRating).toBe(1400);
      expect(result.newRating).toBeLessThan(1400);
    });

    test('should handle draw correctly', () => {
      skillRating.initRating('player1', 1500);
      skillRating.initRating('player2', 1500);
      
      const expected = skillRating.calculateExpectedScore(1500, 1500);
      const result = skillRating.updateRating('player1', expected.playerA, 0.5);
      
      expect(result.change).toBe(0);
    });
  });

  describe('calculateExpectedScore', () => {
    test('should return 50% for equal ratings', () => {
      const result = skillRating.calculateExpectedScore(1500, 1500);
      expect(result.playerA).toBe(0.5);
      expect(result.playerB).toBe(0.5);
    });

    test('should favor higher rated player', () => {
      const result = skillRating.calculateExpectedScore(1600, 1400);
      expect(result.playerA).toBeGreaterThan(0.5);
      expect(result.playerB).toBeLessThan(0.5);
    });

    test('should return values between 0 and 1', () => {
      const result = skillRating.calculateExpectedScore(2000, 1000);
      expect(result.playerA).toBeGreaterThan(0.9);
      expect(result.playerB).toBeLessThan(0.1);
    });
  });

  describe('getLeaderboard', () => {
    test('should return sorted leaderboard', () => {
      skillRating.initRating('player3', 1400);
      skillRating.initRating('player1', 1600);
      skillRating.initRating('player2', 1500);
      
      const leaderboard = skillRating.getLeaderboard();
      
      expect(leaderboard[0].playerId).toBe('player1');
      expect(leaderboard[0].rank).toBe(1);
      expect(leaderboard[1].playerId).toBe('player2');
      expect(leaderboard[2].playerId).toBe('player3');
    });
  });
});

// ============== MatchPairer Tests ==============
describe('MatchPairer', () => {
  let matchPairer;

  beforeEach(() => {
    matchPairer = new MatchPairer({
      maxWaitTime: 300000,
      skillRange: 100
    });
  });

  describe('addToPool', () => {
    test('should add player to pool and return unmatched status', () => {
      const result = matchPairer.addToPool('player1', { rating: 1500 });
      expect(result.matched).toBe(false);
      expect(result.position).toBe(1);
    });

    test('should match two similar rated players', () => {
      const result1 = matchPairer.addToPool('player1', { rating: 1500 });
      const result2 = matchPairer.addToPool('player2', { rating: 1520 });

      // result2 should be matched (player2 finds player1 in queue)
      expect(result2.matched).toBe(true);
    });

    test('should consider deck power in matching', () => {
      const result1 = matchPairer.addToPool('player1', {
        rating: 1500,
        deckPower: 50
      });
      const result2 = matchPairer.addToPool('player2', {
        rating: 1520,
        deckPower: 55
      });

      // result2 should be matched
      expect(result2.matched).toBe(true);
    });
  });

  describe('calculateMatchScore', () => {
    test('should return 0 for identical players', () => {
      const player1 = { rating: 1500, deckPower: 50, waitStartTime: Date.now() };
      const player2 = { rating: 1500, deckPower: 50, waitStartTime: Date.now() };
      
      const score = matchPairer.calculateMatchScore(player1, player2);
      expect(score).toBe(0);
    });

    test('should increase score with rating difference', () => {
      const player1 = { rating: 1500, deckPower: 50, waitStartTime: Date.now() };
      const player2 = { rating: 1600, deckPower: 50, waitStartTime: Date.now() };
      
      const score = matchPairer.calculateMatchScore(player1, player2);
      expect(score).toBeGreaterThan(0);
    });

    test('should decrease score for longer waiting players', () => {
      const now = Date.now();
      const player1 = { rating: 1500, deckPower: 50, waitStartTime: now - 300000 };
      const player2 = { rating: 1500, deckPower: 50, waitStartTime: now };
      
      const score = matchPairer.calculateMatchScore(player1, player2);
      expect(score).toBeLessThan(0); // Wait bonus should make it negative
    });
  });

  describe('isAcceptableMatch', () => {
    test('should accept match within skill range', () => {
      const player1 = { rating: 1500, tolerance: 0.5 };
      const player2 = { rating: 1550, tolerance: 0.5 };
      
      const acceptable = matchPairer.isAcceptableMatch(player1, player2);
      expect(acceptable).toBe(true);
    });

    test('should reject match outside skill range', () => {
      const player1 = { rating: 1500, tolerance: 0.5 };
      const player2 = { rating: 1700, tolerance: 0.5 };
      
      const acceptable = matchPairer.isAcceptableMatch(player1, player2);
      expect(acceptable).toBe(false);
    });

    test('should consider tolerance in matching', () => {
      const player1 = { rating: 1500, tolerance: 0.8 };
      const player2 = { rating: 1540, tolerance: 0.8 }; // Within range: diff=40, maxDiff=40
      
      const acceptable = matchPairer.isAcceptableMatch(player1, player2);
      expect(acceptable).toBe(true);
    });
  });

  describe('getStats', () => {
    test('should return zero stats initially', () => {
      const stats = matchPairer.getStats();
      expect(stats.waitingCount).toBe(0);
      expect(stats.totalPaired).toBe(0);
    });

    test('should track paired matches', () => {
      matchPairer.addToPool('player1', { rating: 1500 });
      matchPairer.addToPool('player2', { rating: 1500 });
      
      const stats = matchPairer.getStats();
      expect(stats.totalPaired).toBe(1);
    });
  });

  describe('trimQueue', () => {
    test('should remove players waiting too long', () => {
      const mp = new MatchPairer({ maxWaitTime: 1000 });
      
      mp.waitingQueue.push({
        playerId: 'oldPlayer',
        rating: 1500,
        waitStartTime: Date.now() - 2000
      });
      
      mp.trimQueue();
      
      expect(mp.waitingQueue.length).toBe(0);
    });

    test('should keep recent players', () => {
      const mp = new MatchPairer({ maxWaitTime: 300000 });
      
      mp.waitingQueue.push({
        playerId: 'recentPlayer',
        rating: 1500,
        waitStartTime: Date.now()
      });
      
      mp.trimQueue();
      
      expect(mp.waitingQueue.length).toBe(1);
    });
  });
});

// ============== Matchmaker Tests ==============
describe('Matchmaker', () => {
  let matchmaker;

  beforeEach(() => {
    matchmaker = new Matchmaker({
      skillRating: { kFactor: 32, initialRating: 1500 },
      matchPairer: { skillRange: 100 }
    });
  });

  describe('registerPlayer', () => {
    test('should register player with default rating', () => {
      matchmaker.registerPlayer('player1');
      expect(matchmaker.skillRating.getRating('player1')).toBe(1500);
    });

    test('should register player with custom rating', () => {
      matchmaker.registerPlayer('player1', { initialRating: 1600 });
      expect(matchmaker.skillRating.getRating('player1')).toBe(1600);
    });
  });

  describe('requestMatch', () => {
    test('should return unmatched for first player', () => {
      const result = matchmaker.requestMatch('player1', { rating: 1500 });
      expect(result.matched).toBe(false);
    });

    test('should match similar rated players', () => {
      const result1 = matchmaker.requestMatch('player1', { rating: 1500 });
      // First player may not get matched immediately
      const result2 = matchmaker.requestMatch('player2', { rating: 1520 });
      
      // Second player should get matched with first when available
      expect(result2.matched).toBe(true);
      // First player should be matched now (second player triggered the match)
      expect(result1.matched || result2.matched).toBe(true);
    });

    test('should include player rating in result', () => {
      const result = matchmaker.requestMatch('player1', { rating: 1600 });
      expect(result.playerRating).toBe(1600);
    });
  });

  describe('completeMatch', () => {
    test('should update winner rating up', () => {
      matchmaker.registerPlayer('player1', { initialRating: 1600 });
      matchmaker.registerPlayer('player2', { initialRating: 1400 });
      
      const initialWinnerRating = matchmaker.skillRating.getRating('player1');
      const result = matchmaker.completeMatch('player1', 'player2');
      
      expect(result.winner.newRating).toBeGreaterThan(initialWinnerRating);
    });

    test('should update loser rating down', () => {
      matchmaker.registerPlayer('player1', { initialRating: 1600 });
      matchmaker.registerPlayer('player2', { initialRating: 1400 });
      
      const initialLoserRating = matchmaker.skillRating.getRating('player2');
      const result = matchmaker.completeMatch('player1', 'player2');
      
      expect(result.loser.newRating).toBeLessThan(initialLoserRating);
    });

    test('should record match in history', () => {
      matchmaker.registerPlayer('player1');
      matchmaker.registerPlayer('player2');
      
      matchmaker.completeMatch('player1', 'player2');
      
      expect(matchmaker.matchHistory.length).toBe(1);
      expect(matchmaker.matchHistory[0].winnerId).toBe('player1');
    });

    test('should handle different match types', () => {
      matchmaker.registerPlayer('player1');
      matchmaker.registerPlayer('player2');
      
      const rankedResult = matchmaker.completeMatch('player1', 'player2', 'ranked');
      expect(rankedResult.match.matchType).toBe('ranked');
      
      const casualResult = matchmaker.completeMatch('player1', 'player2', 'casual');
      expect(casualResult.match.matchType).toBe('casual');
    });
  });

  describe('getPlayerStats', () => {
    test('should return player statistics', () => {
      matchmaker.registerPlayer('player1');
      matchmaker.registerPlayer('player2');
      matchmaker.registerPlayer('player3');
      
      matchmaker.completeMatch('player1', 'player2');
      matchmaker.completeMatch('player2', 'player3');
      
      const stats = matchmaker.getPlayerStats('player1');
      
      expect(stats.rating).toBeDefined();
      expect(stats.wins).toBe(1);
      expect(stats.losses).toBe(0);
      expect(stats.total).toBe(1);
    });

    test('should calculate win rate correctly', () => {
      matchmaker.registerPlayer('player1');
      matchmaker.registerPlayer('player2');
      
      matchmaker.completeMatch('player1', 'player2');
      matchmaker.completeMatch('player2', 'player1');
      
      const stats = matchmaker.getPlayerStats('player1');
      expect(stats.winRate).toBe(0.5);
    });

    test('should return recent form', () => {
      matchmaker.registerPlayer('player1');
      matchmaker.registerPlayer('player2');
      
      matchmaker.completeMatch('player1', 'player2');
      matchmaker.completeMatch('player1', 'player2');
      
      const stats = matchmaker.getPlayerStats('player1');
      expect(stats.recentForm.length).toBeGreaterThan(0);
    });
  });

  describe('getRecentForm', () => {
    test('should return last N matches', () => {
      matchmaker.registerPlayer('player1');
      matchmaker.registerPlayer('player2');
      
      for (let i = 0; i < 15; i++) {
        matchmaker.completeMatch('player1', 'player2');
      }
      
      const form = matchmaker.getRecentForm('player1', 10);
      expect(form.length).toBe(10);
    });

    test('should include win/loss and rating change', () => {
      matchmaker.registerPlayer('player1');
      matchmaker.registerPlayer('player2');
      
      matchmaker.completeMatch('player1', 'player2');
      
      const form = matchmaker.getRecentForm('player1', 5);
      expect(form[0].won).toBe(true);
      expect(form[0].ratingChange).toBeGreaterThan(0);
    });
  });

  describe('getLeaderboard', () => {
    test('should return sorted players', () => {
      matchmaker.registerPlayer('player1', { initialRating: 1400 });
      matchmaker.registerPlayer('player2', { initialRating: 1600 });
      matchmaker.registerPlayer('player3', { initialRating: 1500 });
      
      const leaderboard = matchmaker.getLeaderboard();
      
      expect(leaderboard[0].playerId).toBe('player2');
      expect(leaderboard[1].playerId).toBe('player3');
      expect(leaderboard[2].playerId).toBe('player1');
    });

    test('should limit results', () => {
      for (let i = 0; i < 10; i++) {
        matchmaker.registerPlayer(`player${i}`, { initialRating: 1500 + i });
      }
      
      const leaderboard = matchmaker.getLeaderboard(5);
      expect(leaderboard.length).toBe(5);
    });
  });

  describe('fuzzySearchPlayers', () => {
    test('should find exact match', () => {
      matchmaker.registerPlayer('john_doe');
      matchmaker.registerPlayer('jane_smith');
      
      const results = matchmaker.fuzzySearchPlayers('john');
      expect(results.length).toBe(1);
      expect(results[0].playerId).toBe('john_doe');
    });

    test('should find partial match', () => {
      matchmaker.registerPlayer('john_doe');
      matchmaker.registerPlayer('john_smith');
      
      const results = matchmaker.fuzzySearchPlayers('john');
      expect(results.length).toBe(2);
    });

    test('should return empty for no match', () => {
      matchmaker.registerPlayer('john_doe');
      
      const results = matchmaker.fuzzySearchPlayers('xyz');
      expect(results.length).toBe(0);
    });
  });

  describe('getStatus', () => {
    test('should return system status', () => {
      matchmaker.registerPlayer('player1');
      matchmaker.registerPlayer('player2');
      
      const status = matchmaker.getStatus();
      
      expect(status.playerCount).toBe(2);
      expect(status.matchHistorySize).toBe(0);
    });
  });

  describe('removePlayer', () => {
    test('should remove player from rating system', () => {
      matchmaker.registerPlayer('player1');
      matchmaker.removePlayer('player1');
      
      expect(matchmaker.skillRating.getRating('player1')).toBe(1500); // Reset to initial
    });

    test('should remove player from waiting queue', () => {
      matchmaker.requestMatch('player1', { rating: 1500 });
      matchmaker.removePlayer('player1');
      
      const queue = matchmaker.matchPairer.getWaitingQueue();
      expect(queue.find(p => p.playerId === 'player1')).toBeUndefined();
    });
  });
});

// ============== ELOEngine Tests ==============
describe('EloEngine', () => {
  let eloEngine;

  beforeEach(() => {
    eloEngine = new ELOEngine({
      baseKFactor: 32,
      rankDivisions: [
        { name: 'Bronze', min: 0, max: 999 },
        { name: 'Silver', min: 1000, max: 1199 },
        { name: 'Gold', min: 1200, max: 1399 },
        { name: 'Platinum', min: 1400, max: 1599 },
        { name: 'Diamond', min: 1600, max: 1799 },
        { name: 'Master', min: 1800, max: 1999 },
        { name: 'Grandmaster', min: 2000, max: Infinity }
      ]
    });
  });

  describe('calculateDynamicKFactor', () => {
    test('should return base K factor for new players', () => {
      const kFactor = eloEngine.calculateDynamicKFactor(1500);
      expect(kFactor).toBe(32);
    });

    test('should reduce K factor for high rated players', () => {
      const kFactor2000 = eloEngine.calculateDynamicKFactor(2000);
      expect(kFactor2000).toBe(16);
    });

    test('should reduce K factor for master players', () => {
      const kFactor1850 = eloEngine.calculateDynamicKFactor(1850);
      expect(kFactor1850).toBe(24);
    });

    test('should reduce K factor for casual matches', () => {
      const kFactor = eloEngine.calculateDynamicKFactor(1500, 'casual');
      expect(kFactor).toBe(16);
    });

    test('should increase K factor for tournament matches', () => {
      const kFactor = eloEngine.calculateDynamicKFactor(1500, 'tournament');
      expect(kFactor).toBe(48);
    });
  });

  describe('calculateRatingChange', () => {
    test('should calculate correct rating change for expected win', () => {
      const result = eloEngine.calculateRatingChange({
        winnerRating: 1600,
        loserRating: 1400,
        matchType: 'ranked'
      });
      
      expect(result.winnerChange).toBeGreaterThan(0);
      expect(result.loserChange).toBeLessThan(0);
      expect(result.kFactor).toBe(32);
    });

    test('should calculate correct rating change for upset win', () => {
      const result = eloEngine.calculateRatingChange({
        winnerRating: 1400,
        loserRating: 1600,
        matchType: 'ranked'
      });
      
      expect(result.winnerChange).toBeGreaterThan(16); // More points for upset
    });

    test('should include expected winner score', () => {
      const result = eloEngine.calculateRatingChange({
        winnerRating: 1600,
        loserRating: 1400,
        matchType: 'ranked'
      });
      
      expect(result.expectedWinnerScore).toBeGreaterThan(0.5);
    });
  });

  describe('getRankDivision', () => {
    test('should return correct division for Bronze', () => {
      const division = eloEngine.getRankDivision(800);
      expect(division.name).toBe('Bronze');
    });

    test('should return correct division for Silver', () => {
      const division = eloEngine.getRankDivision(1100);
      expect(division.name).toBe('Silver');
    });

    test('should return correct division for Gold', () => {
      const division = eloEngine.getRankDivision(1300);
      expect(division.name).toBe('Gold');
    });

    test('should return correct division for Platinum', () => {
      const division = eloEngine.getRankDivision(1500);
      expect(division.name).toBe('Platinum');
    });

    test('should return correct division for Diamond', () => {
      const division = eloEngine.getRankDivision(1700);
      expect(division.name).toBe('Diamond');
    });

    test('should return correct division for Master', () => {
      const division = eloEngine.getRankDivision(1900);
      expect(division.name).toBe('Master');
    });

    test('should return correct division for Grandmaster', () => {
      const division = eloEngine.getRankDivision(2100);
      expect(division.name).toBe('Grandmaster');
    });

    test('should include progress percentage', () => {
      const division = eloEngine.getRankDivision(1350);
      expect(division.progress).toBeGreaterThan(0);
      expect(division.progress).toBeLessThan(100);
    });

    test('should return Unranked for invalid rating', () => {
      const division = eloEngine.getRankDivision(-100);
      expect(division.name).toBe('Unranked');
    });
  });

  describe('predictMatch', () => {
    test('should predict equal ratings as 50/50', () => {
      const prediction = eloEngine.predictMatch(1500, 1500);
      expect(prediction.teamAWinProbability).toBe(0.5);
      expect(prediction.teamBWinProbability).toBe(0.5);
    });

    test('should favor higher rated team', () => {
      const prediction = eloEngine.predictMatch(1600, 1400);
      expect(prediction.teamAWinProbability).toBeGreaterThan(0.5);
      expect(prediction.teamBWinProbability).toBeLessThan(0.5);
    });

    test('should include recommended spread', () => {
      const prediction = eloEngine.predictMatch(1500, 1600);
      expect(prediction.recommendedSpread).toBeGreaterThan(0);
    });
  });

  describe('calculateSeasonDecay', () => {
    test('should return 0 for active players', () => {
      const decay = eloEngine.calculateSeasonDecay(10, 'Gold');
      expect(decay).toBe(0);
    });

    test('should apply decay after 30 days', () => {
      const decay = eloEngine.calculateSeasonDecay(60, 'Gold');
      expect(decay).toBeGreaterThan(0);
    });

    test('should cap decay at 50%', () => {
      const decay = eloEngine.calculateSeasonDecay(500, 'Gold');
      expect(decay).toBe(0.5);
    });

    test('should apply lower decay to high ranks', () => {
      const decayMaster = eloEngine.calculateSeasonDecay(60, 'Master');
      const decayGold = eloEngine.calculateSeasonDecay(60, 'Gold');
      expect(decayMaster).toBeLessThan(decayGold);
    });
  });
});

// ============== Integration Tests ==============
describe('Matchmaking System Integration', () => {
  test('should handle full matchmaking workflow', () => {
    const matchmaker = new Matchmaker();
    
    // Register players
    matchmaker.registerPlayer('player1', { initialRating: 1500 });
    matchmaker.registerPlayer('player2', { initialRating: 1520 });
    matchmaker.registerPlayer('player3', { initialRating: 1480 });
    
    // Request matches
    const match1 = matchmaker.requestMatch('player1', { rating: 1500 });
    const match2 = matchmaker.requestMatch('player2', { rating: 1520 });
    
    // Complete match
    const result = matchmaker.completeMatch('player1', 'player2');
    
    // Verify stats updated
    const stats = matchmaker.getPlayerStats('player1');
    expect(stats.total).toBe(1);
    expect(stats.wins).toBe(1);
    
    // Verify leaderboard
    const leaderboard = matchmaker.getLeaderboard();
    expect(leaderboard.length).toBe(3);
  });

  test('should track multiple seasons of matches', () => {
    const matchmaker = new Matchmaker();
    
    matchmaker.registerPlayer('player1', { initialRating: 1500 });
    matchmaker.registerPlayer('player2', { initialRating: 1500 });
    
    // Play multiple matches
    for (let i = 0; i < 20; i++) {
      if (i % 2 === 0) {
        matchmaker.completeMatch('player1', 'player2');
      } else {
        matchmaker.completeMatch('player2', 'player1');
      }
    }
    
    const stats = matchmaker.getPlayerStats('player1');
    expect(stats.total).toBe(20);
  });

  test('should handle concurrent match requests', () => {
    const matchmaker = new Matchmaker();
    
    // Register players first, then request matches
    for (let i = 0; i < 10; i++) {
      matchmaker.registerPlayer(`player${i}`, { initialRating: 1500 + (i * 10) });
      matchmaker.requestMatch(`player${i}`, { rating: 1500 + (i * 10) });
    }
    
    const status = matchmaker.getStatus();
    // Player count reflects registered players
    expect(status.playerCount).toBe(10);
  });
});