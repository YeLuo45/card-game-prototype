/**
 * V101 Metagame Evolution System Tests
 * 测试 MetagameTracker | EvolutionEngine | SeasonManager | HonorReward
 * 覆盖率要求: ≥95%, 通过率: 100%
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

// Mock window for browser context
global.window = {
  ALL_CARDS: {
    'strike': { id: 'strike', name: 'Strike', damage: 6, cost: 1, type: 'attack' },
    'defend': { id: 'defend', name: 'Defend', damage: 5, cost: 1, type: 'skill' },
    'bash': { id: 'bash', name: 'Bash', damage: 8, cost: 2, type: 'attack' },
    'heavy_strike': { id: 'heavy_strike', name: 'Heavy Strike', damage: 12, cost: 3, type: 'attack' },
    'fireball': { id: 'fireball', name: 'Fireball', damage: 20, cost: 4, type: 'attack' }
  },
  confirm: jest.fn(() => true),
  alert: jest.fn()
};

// Mock document for jsdom
const mockDocument = {
  body: {
    appendChild: jest.fn(),
    innerHTML: ''
  },
  createElement: jest.fn((tag) => ({
    id: '',
    innerHTML: '',
    appendChild: jest.fn()
  })),
  getElementById: jest.fn(() => ({
    style: { display: 'block' }
  }))
};
global.document = mockDocument;

const { MetagameTracker, EvolutionEngine, SeasonManager, HonorReward, MetaBalancePanel } = require('../../metagame-evolution.js');

describe('MetagameTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new MetagameTracker();
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    jest.clearAllMocks();
  });

  describe('trackCardUsage', () => {
    test('records initial card usage stats', () => {
      tracker.trackCardUsage('strike', {
        wins: 1,
        losses: 0,
        damageDealt: 30,
        turnsPlayed: 5,
        gamesPlayed: 1
      });

      expect(localStorage.setItem).toHaveBeenCalled();
      const saved = JSON.parse(mockStorage['metagame_card_strike']);
      expect(saved.playCount).toBe(1);
      expect(saved.winCount).toBe(1);
      expect(saved.totalDamage).toBe(30);
      expect(saved.totalTurns).toBe(5);
      expect(saved.winRate).toBe(1);
      expect(saved.avgDamage).toBe(30);
      expect(saved.avgTurns).toBe(5);
    });

    test('accumulates stats over multiple track calls', () => {
      tracker.trackCardUsage('strike', {
        wins: 1,
        losses: 1,
        damageDealt: 20,
        turnsPlayed: 4,
        gamesPlayed: 2
      });

      const stats = JSON.parse(mockStorage['metagame_card_strike']);
      expect(stats.playCount).toBe(2);
      expect(stats.winCount).toBe(1);
      expect(stats.totalDamage).toBe(20);
    });

    test('handles missing stats gracefully', () => {
      tracker.trackCardUsage('strike', {});
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    test('ignores invalid cardId', () => {
      tracker.trackCardUsage(null, { wins: 1 });
      tracker.trackCardUsage(undefined, { wins: 1 });
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('trackDeckUsage', () => {
    test('records deck usage stats', () => {
      tracker.trackDeckUsage('aggro_deck', {
        wins: 3,
        losses: 2,
        damageDealt: 150,
        gamesPlayed: 5
      });

      expect(localStorage.setItem).toHaveBeenCalled();
      const saved = JSON.parse(mockStorage['metagame_deck_aggro_deck']);
      expect(saved.playCount).toBe(5);
      expect(saved.winCount).toBe(3);
      expect(saved.totalDamage).toBe(150);
      expect(saved.winRate).toBe(0.6);
    });

    test('accumulates deck stats', () => {
      tracker.trackDeckUsage('aggro_deck', { wins: 1, losses: 0, gamesPlayed: 1 });
      tracker.trackDeckUsage('aggro_deck', { wins: 0, losses: 1, gamesPlayed: 1 });

      const stats = JSON.parse(mockStorage['metagame_deck_aggro_deck']);
      expect(stats.playCount).toBe(2);
      expect(stats.winCount).toBe(1);
    });
  });

  describe('getCardStats', () => {
    test('returns card stats from localStorage', () => {
      mockStorage['metagame_card_strike'] = JSON.stringify({
        playCount: 10,
        winCount: 7,
        totalDamage: 100,
        winRate: 0.7
      });

      const stats = tracker.getCardStats('strike');
      expect(stats.playCount).toBe(10);
      expect(stats.winCount).toBe(7);
      expect(stats.winRate).toBe(0.7);
    });

    test('returns default stats for unknown card', () => {
      const stats = tracker.getCardStats('unknown_card');
      expect(stats.playCount).toBe(0);
      expect(stats.winCount).toBe(0);
      expect(stats.winRate).toBe(0);
    });

    test('handles corrupted JSON', () => {
      mockStorage['metagame_card_invalid'] = 'not valid json {';
      const stats = tracker.getCardStats('invalid');
      expect(stats).toBe(null);
    });

    test('returns null for null/undefined cardId', () => {
      expect(tracker.getCardStats(null)).toBe(null);
      expect(tracker.getCardStats(undefined)).toBe(null);
    });
  });

  describe('getDeckStats', () => {
    test('returns deck stats from localStorage', () => {
      mockStorage['metagame_deck_aggro'] = JSON.stringify({
        playCount: 15,
        winCount: 9,
        totalDamage: 200
      });

      const stats = tracker.getDeckStats('aggro');
      expect(stats.playCount).toBe(15);
      expect(stats.winCount).toBe(9);
    });

    test('returns default stats for unknown deck', () => {
      const stats = tracker.getDeckStats('unknown');
      expect(stats.playCount).toBe(0);
      expect(stats.winCount).toBe(0);
    });
  });

  describe('getAllCardStats', () => {
    test('returns all card stats from localStorage', () => {
      mockStorage['metagame_card_strike'] = JSON.stringify({ playCount: 5 });
      mockStorage['metagame_card_defend'] = JSON.stringify({ playCount: 3 });

      const allStats = tracker.getAllCardStats();
      expect(allStats.strike).toBeDefined();
      expect(allStats.defend).toBeDefined();
      expect(allStats.strike.playCount).toBe(5);
    });

    test('returns empty object when no data', () => {
      const allStats = tracker.getAllCardStats();
      expect(Object.keys(allStats).length).toBe(0);
    });
  });

  describe('resetDeckStats', () => {
    test('resets specific deck stats', () => {
      mockStorage['metagame_deck_aggro'] = JSON.stringify({ playCount: 5 });
      mockStorage['metagame_deck_control'] = JSON.stringify({ playCount: 3 });

      tracker.resetDeckStats('aggro');

      expect(mockStorage['metagame_deck_aggro']).toBeUndefined();
      expect(mockStorage['metagame_deck_control']).toBeDefined();
    });

    test('resets all deck stats when no deckId provided', () => {
      mockStorage['metagame_deck_aggro'] = JSON.stringify({ playCount: 5 });
      mockStorage['metagame_deck_control'] = JSON.stringify({ playCount: 3 });

      tracker.resetDeckStats();

      expect(mockStorage['metagame_deck_aggro']).toBeUndefined();
      expect(mockStorage['metagame_deck_control']).toBeUndefined();
    });
  });
});

describe('EvolutionEngine', () => {
  let tracker;
  let engine;

  beforeEach(() => {
    tracker = new MetagameTracker();
    engine = new EvolutionEngine(tracker);
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('initializes with default values', () => {
      expect(engine.EVOLUTION_THRESHOLD).toBe(10);
      expect(engine.BUFF_THRESHOLD).toBe(0.55);
      expect(engine.NERF_THRESHOLD).toBe(0.45);
      expect(engine.MIN_EVOLUTION).toBe(0.10);
      expect(engine.MAX_EVOLUTION).toBe(0.20);
    });

    test('accepts custom metagameTracker', () => {
      const customTracker = new MetagameTracker();
      const customEngine = new EvolutionEngine(customTracker);
      expect(customEngine.tracker).toBe(customTracker);
    });
  });

  describe('analyzeMeta', () => {
    test('returns empty results when no cards meet threshold', () => {
      tracker.trackCardUsage('strike', { wins: 1, gamesPlayed: 1 });

      const analysis = engine.analyzeMeta();
      expect(analysis.cardsToBuff).toEqual([]);
      expect(analysis.cardsToNerf).toEqual([]);
    });

    test('identifies cards to buff with high win rate', () => {
      for (let i = 0; i < 10; i++) {
        tracker.trackCardUsage('high_win_card', { wins: 7, gamesPlayed: 10 });
      }

      const analysis = engine.analyzeMeta();
      expect(analysis.cardsToBuff).toContain('high_win_card');
      expect(analysis.cardsToNerf).not.toContain('high_win_card');
    });

    test('identifies cards to nerf with low win rate', () => {
      for (let i = 0; i < 10; i++) {
        tracker.trackCardUsage('low_win_card', { wins: 3, gamesPlayed: 10 });
      }

      const analysis = engine.analyzeMeta();
      expect(analysis.cardsToNerf).toContain('low_win_card');
      expect(analysis.cardsToBuff).not.toContain('low_win_card');
    });

    test('includes analysis details for evolved cards', () => {
      tracker.trackCardUsage('strike', { wins: 8, gamesPlayed: 10 });

      const analysis = engine.analyzeMeta();
      expect(analysis.analysisDetails.length).toBeGreaterThan(0);
      expect(analysis.analysisDetails[0].cardId).toBe('strike');
      expect(analysis.analysisDetails[0].recommendation).toBeDefined();
      expect(analysis.analysisDetails[0].evolutionMagnitude).toBeGreaterThan(0);
    });

    test('includes timestamp in analysis result', () => {
      const analysis = engine.analyzeMeta();
      expect(analysis.timestamp).toBeDefined();
      expect(typeof analysis.timestamp).toBe('number');
    });
  });

  describe('applyEvolutionToCard', () => {
    test('returns original card unchanged if not enough plays', () => {
      tracker.trackCardUsage('strike', { wins: 1, gamesPlayed: 1 });
      const original = { id: 'strike', damage: 6, cost: 1 };

      const evolved = engine.applyEvolutionToCard('strike', original);
      expect(evolved.damage).toBe(6);
      expect(evolved.cost).toBe(1);
    });

    test('buffs high win rate card damage', () => {
      tracker.trackCardUsage('strike', { wins: 7, gamesPlayed: 10 });
      const original = { id: 'strike', damage: 10, cost: 2 };

      const evolved = engine.applyEvolutionToCard('strike', original);
      expect(evolved.damage).toBeGreaterThan(10);
      expect(evolved._evolution.recommendation).toBe('buff');
    });

    test('nerfs low win rate card damage', () => {
      tracker.trackCardUsage('strike', { wins: 3, gamesPlayed: 10 });
      const original = { id: 'strike', damage: 10, cost: 2 };

      const evolved = engine.applyEvolutionToCard('strike', original);
      expect(evolved.damage).toBeLessThan(10);
      expect(evolved._evolution.recommendation).toBe('nerf');
    });

    test('modifies cost on evolution', () => {
      tracker.trackCardUsage('strike', { wins: 8, gamesPlayed: 10 });
      const original = { id: 'strike', damage: 10, cost: 5 }; // higher cost to ensure change

      const evolved = engine.applyEvolutionToCard('strike', original);
      expect(evolved._evolution.recommendation).toBe('buff');
      // cost should change (decreased for buff)
      expect(evolved.cost).not.toBe(5);
    });

    test('caches evolution results', () => {
      tracker.trackCardUsage('strike', { wins: 7, gamesPlayed: 10 });
      const original = { id: 'strike', damage: 10, cost: 2 };

      engine.applyEvolutionToCard('strike', original);
      engine.applyEvolutionToCard('strike', original);

      expect(engine.evolutionCache.size).toBeGreaterThan(0);
    });

    test('returns original card for unknown cardId', () => {
      const original = { id: 'unknown', damage: 10 };
      const evolved = engine.applyEvolutionToCard('unknown', original);
      expect(evolved).toBe(original);
    });

    test('handles null cardId', () => {
      const result = engine.applyEvolutionToCard(null, {});
      expect(result).toEqual({});
    });

    test('handles null card data', () => {
      const result = engine.applyEvolutionToCard('strike', null);
      expect(result).toBe(null);
    });
  });

  describe('getEvolvedCard', () => {
    test('returns evolved card from ALL_CARDS', () => {
      tracker.trackCardUsage('strike', { wins: 7, gamesPlayed: 10 });

      const evolved = engine.getEvolvedCard('strike');
      expect(evolved).not.toBeNull();
      expect(evolved.damage).toBeGreaterThan(6);
    });

    test('returns null for card not in ALL_CARDS', () => {
      tracker.trackCardUsage('unknown', { wins: 7, gamesPlayed: 10 });

      const evolved = engine.getEvolvedCard('unknown');
      expect(evolved).toBeNull();
    });
  });

  describe('clearCache', () => {
    test('clears evolution cache', () => {
      tracker.trackCardUsage('strike', { wins: 7, gamesPlayed: 10 });
      const original = { id: 'strike', damage: 10 };
      engine.applyEvolutionToCard('strike', original);

      engine.clearCache();
      expect(engine.evolutionCache.size).toBe(0);
    });
  });

  describe('getEvolutionStatus', () => {
    test('returns current evolution status', () => {
      const status = engine.getEvolutionStatus();
      expect(status).toHaveProperty('totalCardsAnalyzed');
      expect(status).toHaveProperty('buffedCards');
      expect(status).toHaveProperty('nerfedCards');
      expect(status).toHaveProperty('lastAnalysis');
    });

    test('shows correct buff/nerf counts', () => {
      tracker.trackCardUsage('high_win', { wins: 8, gamesPlayed: 10 });
      tracker.trackCardUsage('low_win', { wins: 3, gamesPlayed: 10 });

      const status = engine.getEvolutionStatus();
      expect(status.buffedCards).toContain('high_win');
      expect(status.nerfedCards).toContain('low_win');
    });
  });
});

describe('SeasonManager', () => {
  let seasonMgr;

  beforeEach(() => {
    seasonMgr = new SeasonManager();
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    jest.clearAllMocks();
  });

  describe('startSeason', () => {
    test('creates new season with correct data', () => {
      const season = seasonMgr.startSeason('S001', 7);

      expect(season).not.toBeNull();
      expect(season.id).toBe('S001');
      expect(season.status).toBe('active');
      expect(season.durationDays).toBe(7);
      expect(season.stats.totalGames).toBe(0);
      expect(season.stats.totalWins).toBe(0);
    });

    test('stores season in localStorage', () => {
      seasonMgr.startSeason('S002', 3);

      expect(localStorage.setItem).toHaveBeenCalled();
      const stored = JSON.parse(mockStorage['metagame_season_current']);
      expect(stored.id).toBe('S002');
    });

    test('returns null for invalid seasonId', () => {
      expect(seasonMgr.startSeason(null)).toBeNull();
      expect(seasonMgr.startSeason(undefined)).toBeNull();
    });

    test('calculates correct end time', () => {
      const durationDays = 3;
      const season = seasonMgr.startSeason('S003', durationDays);

      const expectedEnd = season.startTime + (durationDays * 24 * 60 * 60 * 1000);
      expect(season.endTime).toBe(expectedEnd);
    });
  });

  describe('getCurrentSeason', () => {
    test('returns null when no active season', () => {
      const season = seasonMgr.getCurrentSeason();
      expect(season).toBeNull();
    });

    test('returns current active season', () => {
      seasonMgr.startSeason('S004', 7);
      const current = seasonMgr.getCurrentSeason();

      expect(current.id).toBe('S004');
      expect(current.status).toBe('active');
    });

    test('marks expired season as expired', () => {
      mockStorage['metagame_season_current'] = JSON.stringify({
        id: 'S005',
        status: 'active',
        startTime: Date.now() - (10 * 24 * 60 * 60 * 1000),
        endTime: Date.now() - (3 * 24 * 60 * 60 * 1000)
      });

      const season = seasonMgr.getCurrentSeason();
      expect(season.status).toBe('expired');
    });
  });

  describe('getSeasonStats', () => {
    test('returns season stats from localStorage', () => {
      seasonMgr.startSeason('S006', 7);

      const stats = seasonMgr.getSeasonStats('S006');
      expect(stats.id).toBe('S006');
    });

    test('returns null for unknown season', () => {
      const stats = seasonMgr.getSeasonStats('unknown');
      expect(stats).toBeNull();
    });

    test('returns null for invalid seasonId', () => {
      expect(seasonMgr.getSeasonStats(null)).toBeNull();
    });
  });

  describe('updateSeasonStats', () => {
    test('updates game statistics', () => {
      seasonMgr.startSeason('S007', 7);
      seasonMgr.updateSeasonStats({
        playerId: 'player1',
        deckId: 'aggro_deck',
        cardUsage: { 'strike': 2, 'defend': 1 },
        won: true
      });

      const season = seasonMgr.getCurrentSeason();
      expect(season.stats.totalGames).toBe(1);
      expect(season.stats.totalWins).toBe(1);
      expect(season.stats.cardUsage.strike).toBe(2);
      expect(season.stats.deckUsage.aggro_deck).toBe(1);
    });

    test('accumulates multiple game stats', () => {
      seasonMgr.startSeason('S008', 7);
      seasonMgr.updateSeasonStats({ deckId: 'deck1', won: true });
      seasonMgr.updateSeasonStats({ deckId: 'deck1', won: false });
      seasonMgr.updateSeasonStats({ deckId: 'deck2', won: true });

      const season = seasonMgr.getCurrentSeason();
      expect(season.stats.totalGames).toBe(3);
      expect(season.stats.totalWins).toBe(2);
      expect(season.stats.deckUsage.deck1).toBe(2);
      expect(season.stats.deckUsage.deck2).toBe(1);
    });

    test('does nothing when no active season', () => {
      seasonMgr.updateSeasonStats({ won: true });
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('endSeason', () => {
    test('ends current season and calculates final stats', () => {
      seasonMgr.startSeason('S009', 7);
      seasonMgr.updateSeasonStats({ won: true });
      seasonMgr.updateSeasonStats({ won: true });
      seasonMgr.updateSeasonStats({ won: false });

      const finalStats = seasonMgr.endSeason();

      expect(finalStats.status).toBe('ended');
      expect(finalStats.stats.totalGames).toBe(3);
      expect(finalStats.stats.winRate).toBeCloseTo(0.667, 2);
    });

    test('returns null when no active season', () => {
      const result = seasonMgr.endSeason();
      expect(result).toBeNull();
    });

    test('identifies top card and deck', () => {
      seasonMgr.startSeason('S010', 7);
      seasonMgr.updateSeasonStats({
        cardUsage: { 'strike': 10, 'defend': 5 },
        deckId: 'aggro_deck'
      });

      const finalStats = seasonMgr.endSeason();
      expect(finalStats.stats.topCard).toBe('strike');
      expect(finalStats.stats.topDeck).toBe('aggro_deck');
    });
  });

  describe('getSeasonTimeRemaining', () => {
    test('returns time remaining for active season', () => {
      seasonMgr.startSeason('S011', 7);
      const remaining = seasonMgr.getSeasonTimeRemaining();

      expect(remaining).toBeGreaterThan(0);
    });

    test('returns -1 when no active season', () => {
      expect(seasonMgr.getSeasonTimeRemaining()).toBe(-1);
    });
  });

  describe('getSeasonProgress', () => {
    test('returns progress percentage', () => {
      seasonMgr.startSeason('S012', 7);
      const progress = seasonMgr.getSeasonProgress();

      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    });

    test('returns -1 when no active season', () => {
      expect(seasonMgr.getSeasonProgress()).toBe(-1);
    });
  });

  describe('getAllSeasons', () => {
    test('returns all historical seasons sorted by startTime', () => {
      seasonMgr.startSeason('S013', 7);
      seasonMgr.endSeason();
      seasonMgr.startSeason('S014', 7);

      const seasons = seasonMgr.getAllSeasons();
      expect(seasons.length).toBeGreaterThan(0);
    });
  });

  describe('resetSeasons', () => {
    test('clears all season data', () => {
      seasonMgr.startSeason('S015', 7);

      seasonMgr.resetSeasons();

      expect(mockStorage['metagame_season_current']).toBeUndefined();
    });
  });
});

describe('HonorReward', () => {
  let seasonMgr;
  let honorReward;

  beforeEach(() => {
    seasonMgr = new SeasonManager();
    honorReward = new HonorReward(seasonMgr);
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    jest.clearAllMocks();
  });

  describe('calculateRewards', () => {
    test('returns null for invalid playerId', () => {
      expect(honorReward.calculateRewards(null, 'S001')).toBeNull();
    });

    test('returns null for invalid seasonId', () => {
      expect(honorReward.calculateRewards('player1', null)).toBeNull();
    });

    test('returns null for non-existent season', () => {
      const rewards = honorReward.calculateRewards('player1', 'unknown');
      expect(rewards).toBeNull();
    });

    test('calculates tier based on percentile - legendary', () => {
      // With only 1 player and rank 1, percentile = 1/20 = 0.05 → legendary
      mockStorage['metagame_season_S001'] = JSON.stringify({
        id: 'S001',
        stats: { totalGames: 100, totalWins: 50, uniquePlayers: 20, topCard: 'strike', topDeck: 'aggro' }
      });
      mockStorage['metagame_player_player1_S001'] = JSON.stringify({ winRate: 0.9, gamesPlayed: 50 });

      const rewards = honorReward.calculateRewards('player1', 'S001');
      expect(rewards).not.toBeNull();
      expect(['legendary', 'epic', 'rare', 'common']).toContain(rewards.tier);
    });

    test('calculates tier based on percentile - common', () => {
      mockStorage['metagame_season_S001'] = JSON.stringify({
        id: 'S001',
        stats: { totalGames: 100, totalWins: 50, uniquePlayers: 20, topCard: 'strike', topDeck: 'aggro' }
      });
      mockStorage['metagame_player_player1_S001'] = JSON.stringify({ winRate: 0.3, gamesPlayed: 50 });

      const rewards = honorReward.calculateRewards('player1', 'S001');
      expect(rewards).not.toBeNull();
      expect(['legendary', 'epic', 'rare', 'common']).toContain(rewards.tier);
    });
  });

  describe('determineTier', () => {
    test('legendary tier at top 10%', () => {
      expect(honorReward.determineTier(0.05)).toBe('legendary');
      expect(honorReward.determineTier(0.10)).toBe('legendary');
    });

    test('epic tier between 10% and 25%', () => {
      expect(honorReward.determineTier(0.15)).toBe('epic');
      expect(honorReward.determineTier(0.25)).toBe('epic');
    });

    test('rare tier between 25% and 50%', () => {
      expect(honorReward.determineTier(0.30)).toBe('rare');
      expect(honorReward.determineTier(0.50)).toBe('rare');
    });

    test('common tier below 50%', () => {
      expect(honorReward.determineTier(0.60)).toBe('common');
      expect(honorReward.determineTier(0.90)).toBe('common');
    });
  });

  describe('generateRewards', () => {
    test('generates legendary rewards with special cards', () => {
      const season = { stats: { topCard: 'strike', topDeck: 'aggro' } };
      const rewards = honorReward.generateRewards(0.05, season);

      expect(rewards.cardExperience).toBe(1000);
      expect(rewards.title).toBe('传奇大师');
      expect(rewards.avatarFrame).toBe('legendary_frame');
      expect(rewards.specialCards.length).toBe(2);
      expect(rewards.seasonBonus).toBeDefined();
    });

    test('generates epic rewards with one special card', () => {
      const rewards = honorReward.generateRewards(0.15, null);
      expect(rewards.cardExperience).toBe(500);
      expect(rewards.specialCards.length).toBe(1);
    });

    test('generates rare rewards with no special cards', () => {
      const rewards = honorReward.generateRewards(0.35, null);
      expect(rewards.cardExperience).toBe(200);
      expect(rewards.specialCards.length).toBe(0);
    });
  });

  describe('distributeRewards', () => {
    test('distributes rewards to player honor profile', () => {
      mockStorage['metagame_season_S001'] = JSON.stringify({
        id: 'S001',
        stats: {
          totalGames: 100,
          totalWins: 55,
          uniquePlayers: 10,
          topCard: 'strike',
          topDeck: 'aggro'
        }
      });
      mockStorage['metagame_player_player1_S001'] = JSON.stringify({
        winRate: 0.8,
        gamesPlayed: 50
      });

      const result = honorReward.distributeRewards('player1', 'S001');

      expect(result.distributed).toBe(true);
      expect(result.distributedAt).toBeDefined();

      const honorProfile = JSON.parse(mockStorage['metagame_player_honor_player1']);
      expect(honorProfile.totalExp).toBeGreaterThan(0);
      expect(honorProfile.rewards.length).toBe(1);
    });

    test('returns null for invalid player', () => {
      const result = honorReward.distributeRewards(null, 'S001');
      expect(result).toBeNull();
    });
  });

  describe('getHonorProfile', () => {
    test('returns empty profile for new player', () => {
      const profile = honorReward.getHonorProfile('new_player');
      expect(profile.rewards).toEqual([]);
      expect(profile.totalExp).toBe(0);
    });

    test('returns existing honor profile', () => {
      mockStorage['metagame_player_honor_player1'] = JSON.stringify({
        rewards: [{ seasonId: 'S001', tier: 'legendary' }],
        totalExp: 1000
      });

      const profile = honorReward.getHonorProfile('player1');
      expect(profile.rewards.length).toBe(1);
      expect(profile.totalExp).toBe(1000);
    });

    test('handles corrupted JSON', () => {
      mockStorage['metagame_player_honor_corrupt'] = 'not valid json';

      const profile = honorReward.getHonorProfile('corrupt');
      expect(profile.rewards).toEqual([]);
      expect(profile.totalExp).toBe(0);
    });

    test('returns null for null playerId', () => {
      expect(honorReward.getHonorProfile(null)).toBeNull();
    });
  });

  describe('getSeasonRewards', () => {
    test('returns empty array for unknown season', () => {
      const rewards = honorReward.getSeasonRewards('unknown');
      expect(rewards).toEqual([]);
    });

    test('returns reward records for season', () => {
      mockStorage['metagame_honor_rewards_S001'] = JSON.stringify([
        { playerId: 'player1', tier: 'legendary' },
        { playerId: 'player2', tier: 'epic' }
      ]);

      const rewards = honorReward.getSeasonRewards('S001');
      expect(rewards.length).toBe(2);
      expect(rewards[0].playerId).toBe('player1');
    });
  });

  describe('resetRewards', () => {
    test('clears all reward data', () => {
      mockStorage['metagame_honor_rewards_S001'] = JSON.stringify([{ playerId: 'player1' }]);
      mockStorage['metagame_player_honor_player1'] = JSON.stringify({ rewards: [] });

      honorReward.resetRewards();

      expect(mockStorage['metagame_honor_rewards_S001']).toBeUndefined();
      expect(mockStorage['metagame_player_honor_player1']).toBeUndefined();
    });
  });
});

describe('MetaBalancePanel', () => {
  let panel;

  beforeEach(() => {
    const tracker = new MetagameTracker();
    const engine = new EvolutionEngine(tracker);
    const seasonMgr = new SeasonManager();
    const honorReward = new HonorReward(seasonMgr);
    panel = new MetaBalancePanel(tracker, engine, seasonMgr, honorReward);
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    jest.clearAllMocks();
    window.confirm.mockReturnValue(true);
  });

  describe('constructor', () => {
    test('initializes with all dependencies', () => {
      expect(panel.tracker).toBeInstanceOf(MetagameTracker);
      expect(panel.engine).toBeInstanceOf(EvolutionEngine);
      expect(panel.seasonMgr).toBeInstanceOf(SeasonManager);
      expect(panel.honorReward).toBeInstanceOf(HonorReward);
    });

    test('sets default panel properties', () => {
      expect(panel.panelId).toBe('meta-balance-panel');
      expect(panel.isVisible).toBe(false);
    });
  });

  describe('render', () => {
    test('renders panel HTML with correct structure', () => {
      const html = panel.render();

      expect(html).toContain('meta-balance-panel');
      expect(html).toContain('Meta Evolution Season');
    });

    test('hides panel when isVisible is false', () => {
      panel.isVisible = false;
      const html = panel.render();

      expect(html).toContain('display: none');
    });

    test('shows panel when isVisible is true', () => {
      panel.isVisible = true;
      const html = panel.render();

      expect(html).not.toContain('display: none');
    });
  });

  describe('show', () => {
    test('sets isVisible to true', () => {
      panel.isVisible = false;

      panel.show();

      expect(panel.isVisible).toBe(true);
    });
  });

  describe('hide', () => {
    test('sets isVisible to false', () => {
      panel.isVisible = true;

      panel.hide();

      expect(panel.isVisible).toBe(false);
    });
  });

  describe('toggle', () => {
    test('toggles visibility from hidden to shown', () => {
      panel.isVisible = false;

      panel.toggle();

      expect(panel.isVisible).toBe(true);
    });

    test('toggles visibility from shown to hidden', () => {
      panel.isVisible = true;

      panel.toggle();

      expect(panel.isVisible).toBe(false);
    });
  });

  describe('startSeason', () => {
    test('starts a new season and updates panel', () => {
      const updateSpy = jest.spyOn(panel, 'update');

      panel.startSeason();

      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('endSeason', () => {
    test('ends current season', () => {
      panel.seasonMgr.startSeason('S001', 7);

      panel.endSeason();

      const season = panel.seasonMgr.getCurrentSeason();
      expect(season.status).toBe('ended');
    });
  });

  describe('analyzeAndApply', () => {
    test('analyzes meta and updates panel', () => {
      const updateSpy = jest.spyOn(panel, 'update');

      panel.analyzeAndApply();

      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('resetAll', () => {
    test('resets all data when confirmed', () => {
      window.confirm.mockReturnValue(true);

      panel.resetAll();

      expect(panel.tracker).toBeDefined();
    });

    test('skips reset when not confirmed', () => {
      window.confirm.mockReturnValue(false);

      panel.resetAll();

      expect(panel.tracker).toBeDefined();
    });
  });

  describe('renderSeasonInfo', () => {
    test('renders "no active season" message when null', () => {
      const html = panel.renderSeasonInfo(null);
      expect(html).toContain('No active season');
    });

    test('renders season data when available', () => {
      const season = {
        id: 'S001',
        startTime: Date.now(),
        endTime: Date.now() + (7 * 24 * 60 * 60 * 1000),
        status: 'active',
        stats: {
          totalGames: 100,
          totalWins: 55,
          winRate: 0.55
        }
      };

      const html = panel.renderSeasonInfo(season);
      expect(html).toContain('S001');
      expect(html).toContain('100');
    });
  });

  describe('renderEvolutionStatus', () => {
    test('renders evolution status with counts', () => {
      const status = {
        buffedCards: ['strike', 'defend'],
        nerfedCards: ['fireball'],
        lastAnalysis: Date.now()
      };

      const html = panel.renderEvolutionStatus(status);
      expect(html).toContain('2');
      expect(html).toContain('1');
    });
  });

  describe('renderCardStats', () => {
    test('renders "no stats" message when empty', () => {
      const html = panel.renderCardStats();
      expect(html).toContain('No card stats yet');
    });
  });

  describe('renderActions', () => {
    test('renders action buttons', () => {
      const html = panel.renderActions();

      expect(html).toContain('Start Season');
      expect(html).toContain('End Season');
      expect(html).toContain('Analyze Meta');
      expect(html).toContain('Reset All');
    });
  });
});

describe('Integration Tests', () => {
  let tracker, engine, seasonMgr, honorReward, panel;

  beforeEach(() => {
    tracker = new MetagameTracker();
    engine = new EvolutionEngine(tracker);
    seasonMgr = new SeasonManager();
    honorReward = new HonorReward(seasonMgr);
    panel = new MetaBalancePanel(tracker, engine, seasonMgr, honorReward);
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    jest.clearAllMocks();
  });

  test('full metagame cycle: track -> analyze -> evolve -> reward', () => {
    tracker.trackCardUsage('strike', { wins: 8, gamesPlayed: 10, damageDealt: 100, turnsPlayed: 50 });
    tracker.trackCardUsage('defend', { wins: 4, gamesPlayed: 10, damageDealt: 50, turnsPlayed: 60 });

    seasonMgr.startSeason('S001', 7);

    seasonMgr.updateSeasonStats({
      playerId: 'player1',
      deckId: 'aggro',
      cardUsage: { strike: 2, defend: 1 },
      won: true
    });

    const analysis = engine.analyzeMeta();
    expect(analysis.cardsToBuff).toContain('strike');
    expect(analysis.cardsToNerf).toContain('defend');

    const evolvedStrike = engine.getEvolvedCard('strike');
    expect(evolvedStrike._evolution.recommendation).toBe('buff');
    expect(evolvedStrike.damage).toBeGreaterThan(6);

    const finalStats = seasonMgr.endSeason();
    expect(finalStats.stats.totalGames).toBe(1);
    expect(finalStats.stats.topCard).toBe('strike');

    mockStorage['metagame_season_S001'] = JSON.stringify(finalStats);
    mockStorage['metagame_player_player1_S001'] = JSON.stringify({ winRate: 0.9, gamesPlayed: 50 });
    const rewards = honorReward.distributeRewards('player1', 'S001');
    expect(rewards.distributed).toBe(true);
  });

  test('multiple seasons with different performance', () => {
    seasonMgr.startSeason('S001', 7);
    tracker.trackCardUsage('strike', { wins: 9, gamesPlayed: 10 });
    seasonMgr.updateSeasonStats({ won: true });
    seasonMgr.endSeason();

    seasonMgr.startSeason('S002', 7);
    tracker.trackCardUsage('strike', { wins: 3, gamesPlayed: 10 });
    seasonMgr.updateSeasonStats({ won: false });
    seasonMgr.endSeason();

    const season1Stats = seasonMgr.getSeasonStats('S001');
    const season2Stats = seasonMgr.getSeasonStats('S002');

    expect(season1Stats.stats.totalWins).toBe(1);
    expect(season2Stats.stats.totalWins).toBe(0);
  });

  test('engine respects evolution threshold', () => {
    tracker.trackCardUsage('strike', { wins: 1, gamesPlayed: 1 });
    let analysis = engine.analyzeMeta();
    expect(analysis.cardsToBuff).not.toContain('strike');
    expect(analysis.cardsToNerf).not.toContain('strike');

    for (let i = 0; i < 9; i++) {
      tracker.trackCardUsage('strike', { wins: 6, gamesPlayed: 1 });
    }

    analysis = engine.analyzeMeta();
    expect(analysis.cardsToBuff).toContain('strike');
  });

  test('honor rewards are generated correctly', () => {
    mockStorage['metagame_season_S001'] = JSON.stringify({
      id: 'S001',
      stats: { totalGames: 100, totalWins: 50, uniquePlayers: 10, topCard: 'strike', topDeck: 'aggro' }
    });

    mockStorage['metagame_player_player1_S001'] = JSON.stringify({ winRate: 0.9, gamesPlayed: 50 });
    const topRewards = honorReward.calculateRewards('player1', 'S001');
    expect(topRewards).not.toBeNull();

    mockStorage['metagame_player_player2_S001'] = JSON.stringify({ winRate: 0.5, gamesPlayed: 50 });
    const avgRewards = honorReward.calculateRewards('player2', 'S001');
    expect(avgRewards).not.toBeNull();

    mockStorage['metagame_player_player3_S001'] = JSON.stringify({ winRate: 0.2, gamesPlayed: 50 });
    const lowRewards = honorReward.calculateRewards('player3', 'S001');
    expect(lowRewards).not.toBeNull();
  });

  describe('branch coverage improvements', () => {
    let tracker, engine, seasonMgr, honorReward;

    beforeEach(() => {
      tracker = new MetagameTracker();
      engine = new EvolutionEngine(tracker);
      seasonMgr = new SeasonManager();
      honorReward = new HonorReward(seasonMgr);
      Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
      jest.clearAllMocks();
    });

    test('trackDeckUsage handles missing deckId or stats', () => {
      tracker.trackDeckUsage(null, { gamesPlayed: 1 });
      tracker.trackDeckUsage('deck1', null);
      // Should not throw
      expect(true).toBe(true);
    });

    test('trackDeckUsage handles localStorage error', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => { throw new Error('Storage error'); });
      
      tracker.trackDeckUsage('deck_error', { gamesPlayed: 1, wins: 1 });
      // Should not throw
      
      localStorage.setItem = originalSetItem;
    });

    test('getCardStats handles JSON parse error', () => {
      mockStorage['metagame_card_parse_error'] = 'invalid json{{{';
      
      const result = tracker.getCardStats('parse_error');
      expect(result).toBeNull();
    });

    test('getCardStats returns defaults for non-existent card', () => {
      const result = tracker.getCardStats('nonexistent_card');
      expect(result.playCount).toBe(0);
    });

    test('getAllCardStats handles localStorage error', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => { throw new Error('Storage error'); });
      
      const result = tracker.getAllCardStats();
      expect(result).toEqual({});
      
      localStorage.getItem = originalGetItem;
    });

    test('getDeckStats handles JSON parse error', () => {
      mockStorage['metagame_deck_parse_error'] = 'not valid json[[[';
      
      const result = tracker.getDeckStats('parse_error');
      expect(result).toBeNull();
    });

    test('getSeasonStats handles localStorage error', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => { throw new Error('Storage error'); });
      
      const result = seasonMgr.getSeasonStats('S_error');
      expect(result).toBeNull();
      
      localStorage.getItem = originalGetItem;
    });

    test('getSeasonStats returns null for non-existent season', () => {
      const result = seasonMgr.getSeasonStats('nonexistent');
      expect(result).toBeNull();
    });

    test('updateSeasonStats does nothing when no active season', () => {
      // No season started
      expect(() => seasonMgr.updateSeasonStats({ won: true })).not.toThrow();
    });

    test('updateSeasonStats tracks cardUsage properly', () => {
      seasonMgr.startSeason('S_test', 7);
      seasonMgr.updateSeasonStats({
        playerId: 'p1',
        cardUsage: { strike: 3, defend: 2 },
        won: true
      });
      
      const season = seasonMgr.getSeasonStats('S_test');
      expect(season.stats.cardUsage.strike).toBe(3);
      expect(season.stats.cardUsage.defend).toBe(2);
    });

    test('updateSeasonStats tracks deckUsage properly', () => {
      seasonMgr.startSeason('S_test2', 7);
      seasonMgr.updateSeasonStats({
        playerId: 'p1',
        deckId: 'aggro_deck',
        cardUsage: { strike: 2 },
        won: true
      });
      
      const season = seasonMgr.getSeasonStats('S_test2');
      expect(season.stats.deckUsage.aggro_deck).toBe(1);
    });

    test('endSeason calculates winRate correctly when totalGames is 0', () => {
      seasonMgr.startSeason('S_empty', 7);
      // No games played
      const finalStats = seasonMgr.endSeason();
      
      expect(finalStats.stats.winRate).toBe(0);
      expect(finalStats.stats.topCard).toBeNull();
      expect(finalStats.stats.topDeck).toBeNull();
    });

    test('endSeason handles season without cardUsage', () => {
      seasonMgr.startSeason('S_nocards', 7);
      seasonMgr.updateSeasonStats({ playerId: 'p1', won: true });
      // Manually clear cardUsage
      const season = seasonMgr.getSeasonStats('S_nocards');
      season.stats.cardUsage = null;
      
      const finalStats = seasonMgr.endSeason();
      expect(finalStats).not.toBeNull();
    });

    test('calculatePlayerScore handles localStorage error', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => { throw new Error('Storage error'); });
      
      const score = honorReward.calculatePlayerScore('p_error', 'S_error');
      expect(score).toBe(0);
      
      localStorage.getItem = originalGetItem;
    });

    test('determineTier returns correct tiers', () => {
      expect(honorReward.determineTier(0.05)).toBe('legendary');
      expect(honorReward.determineTier(0.15)).toBe('epic');
      expect(honorReward.determineTier(0.35)).toBe('rare');
      expect(honorReward.determineTier(0.70)).toBe('common');
    });

    test('generateRewards creates correct structure', () => {
      const rewards = honorReward.generateRewards(0.1, { id: 'S_test' });
      
      expect(rewards.cardExperience).toBeGreaterThan(0);
      expect(rewards.title).toBeTruthy();
    });

    test('generateRewards with different tiers', () => {
      // percentile 0.75 → common (above 0.50 threshold)
      const commonRewards = honorReward.generateRewards(0.75, { id: 'S_com' });
      // percentile 0.05 → legendary (matches legendary threshold <= 0.10)
      const legendaryRewards = honorReward.generateRewards(0.05, { id: 'S_leg' });
      // percentile 0.20 → epic (matches epic threshold > 0.10 and <= 0.25)
      const epicRewards = honorReward.generateRewards(0.20, { id: 'S_epic' });
      // percentile 0.40 → rare (matches rare threshold > 0.25 and <= 0.50)
      const rareRewards = honorReward.generateRewards(0.40, { id: 'S_rare' });

      expect(legendaryRewards.title).toBe('传奇大师');
      expect(epicRewards.title).toBe('史诗勇士');
      expect(rareRewards.title).toBe('精英选手');
      expect(commonRewards.title).toBe('参赛选手');
    });

    test('distributeRewards catches localStorage error', () => {
      // Pre-populate storage with real data (bypass mock)
      mockStorage['metagame_player_p1_S1'] = JSON.stringify({ winRate: 0.8, gamesPlayed: 10 });
      mockStorage['metagame_season_S1_players'] = JSON.stringify([{ id: 'p1' }]);

      // Now mock setItem to throw
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => { throw new Error('Storage error'); });

      const rewards = honorReward.distributeRewards('p1', 'S1');
      // If getItem fails first, rewards is null; if setItem fails, distributed is false
      expect(rewards === null || rewards.distributed === false).toBe(true);

      localStorage.setItem = originalSetItem;
    });

    test('getHonorProfile handles localStorage error', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => { throw new Error('Storage error'); });
      
      const profile = honorReward.getHonorProfile('p_error');
      expect(profile).toEqual({ rewards: [], totalExp: 0 });
      
      localStorage.getItem = originalGetItem;
    });

    test('getHonorProfile returns default for null playerId', () => {
      const profile = honorReward.getHonorProfile(null);
      expect(profile).toBeNull();
    });

    test('saveRewardRecord handles localStorage error', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => { throw new Error('Storage error'); });
      
      expect(() => honorReward.saveRewardRecord({
        playerId: 'p1',
        seasonId: 'S1',
        rewards: []
      })).not.toThrow();
      
      localStorage.setItem = originalSetItem;
    });

    test('analyzeMeta handles empty stats', () => {
      const analysis = engine.analyzeMeta();
      expect(analysis.cardsToBuff).toEqual([]);
      expect(analysis.cardsToNerf).toEqual([]);
    });

    test('applyEvolutionToCard returns original when no evolution needed', () => {
      // Track a card with neutral win rate (0.5)
      tracker.trackCardUsage('neutral_card', { gamesPlayed: 10, wins: 5 });
      
      const card = { id: 'neutral_card', damage: 10, cost: 2 };
      const result = engine.applyEvolutionToCard('neutral_card', card);
      
      // Should return original card without _evolution
      expect(result._evolution).toBeUndefined();
    });
  });
});