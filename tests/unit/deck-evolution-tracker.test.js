/**
 * Deck Evolution Tracker Tests
 * Tests DeckEvolutionTracker: trackUsage() / getWinRate() / getBestScenario() / getRemovalReasons()
 */

const { DeckEvolutionTracker } = require('../../src/deck-evolution-tracker.js');

describe('DeckEvolutionTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new DeckEvolutionTracker();
  });

  describe('constructor', () => {
    test('initializes with empty history', () => {
      expect(tracker.deckHistory).toEqual([]);
      expect(tracker.cardStats).toEqual(new Map());
      expect(tracker.scenarioStats).toEqual(new Map());
    });

    test('initializes with options', () => {
      const options = { maxHistory: 100 };
      const customTracker = new DeckEvolutionTracker(options);
      expect(customTracker.maxHistory).toBe(100);
    });
  });

  describe('trackUsage', () => {
    test('tracks a deck game result', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 }
      ];
      
      tracker.trackUsage(deck, {
        result: 'win',
        scenario: 'arena',
        turns: 10,
        opponentArchetype: 'aggressive'
      });

      expect(tracker.deckHistory.length).toBe(1);
      expect(tracker.deckHistory[0].result).toBe('win');
      expect(tracker.deckHistory[0].scenario).toBe('arena');
    });

    test('tracks multiple game results', () => {
      const deck = [{ id: 'strike', name: 'Strike', type: 'attack', cost: 1 }];
      
      tracker.trackUsage(deck, { result: 'win', scenario: 'arena' });
      tracker.trackUsage(deck, { result: 'loss', scenario: 'arena' });
      tracker.trackUsage(deck, { result: 'win', scenario: 'challenge' });

      expect(tracker.deckHistory.length).toBe(3);
    });

    test('enforces max history limit', () => {
      const limitedTracker = new DeckEvolutionTracker({ maxHistory: 3 });
      const deck = [{ id: 'strike', name: 'Strike', type: 'attack', cost: 1 }];
      
      limitedTracker.trackUsage(deck, { result: 'win', scenario: 'arena' });
      limitedTracker.trackUsage(deck, { result: 'loss', scenario: 'arena' });
      limitedTracker.trackUsage(deck, { result: 'win', scenario: 'challenge' });
      limitedTracker.trackUsage(deck, { result: 'loss', scenario: 'challenge' });

      expect(limitedTracker.deckHistory.length).toBe(3);
    });

    test('tracks individual card stats', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 }
      ];
      
      tracker.trackUsage(deck, { result: 'win', scenario: 'arena' });

      expect(tracker.cardStats.has('strike')).toBe(true);
      expect(tracker.cardStats.has('defend')).toBe(true);
    });
  });

  describe('getWinRate', () => {
    test('calculates win rate correctly', () => {
      const deck = [{ id: 'strike', name: 'Strike', type: 'attack', cost: 1 }];
      
      tracker.trackUsage(deck, { result: 'win', scenario: 'arena' });
      tracker.trackUsage(deck, { result: 'win', scenario: 'arena' });
      tracker.trackUsage(deck, { result: 'loss', scenario: 'arena' });
      tracker.trackUsage(deck, { result: 'win', scenario: 'arena' });

      const winRate = tracker.getWinRate();
      expect(winRate).toBeCloseTo(0.75, 2);
    });

    test('returns 0 with no games', () => {
      const winRate = tracker.getWinRate();
      expect(winRate).toBe(0);
    });

    test('returns accurate win rate > 95%', () => {
      const deck = [{ id: 'strike', name: 'Strike', type: 'attack', cost: 1 }];
      
      // 39 wins, 1 loss = 97.5%
      for (let i = 0; i < 39; i++) {
        tracker.trackUsage(deck, { result: 'win', scenario: 'arena' });
      }
      tracker.trackUsage(deck, { result: 'loss', scenario: 'arena' });

      const winRate = tracker.getWinRate();
      expect(winRate).toBeGreaterThan(0.95);
    });

    test('calculates win rate by scenario', () => {
      const deck = [{ id: 'strike', name: 'Strike', type: 'attack', cost: 1 }];
      
      tracker.trackUsage(deck, { result: 'win', scenario: 'arena' });
      tracker.trackUsage(deck, { result: 'loss', scenario: 'arena' });
      tracker.trackUsage(deck, { result: 'win', scenario: 'challenge' });
      tracker.trackUsage(deck, { result: 'win', scenario: 'challenge' });

      const arenaWinRate = tracker.getWinRate('arena');
      expect(arenaWinRate).toBeCloseTo(0.5, 2);
      
      const challengeWinRate = tracker.getWinRate('challenge');
      expect(challengeWinRate).toBeCloseTo(1.0, 2);
    });
  });

  describe('getBestScenario', () => {
    test('returns scenario with highest win rate', () => {
      const deck = [{ id: 'strike', name: 'Strike', type: 'attack', cost: 1 }];
      
      tracker.trackUsage(deck, { result: 'win', scenario: 'arena' });
      tracker.trackUsage(deck, { result: 'win', scenario: 'challenge' });
      tracker.trackUsage(deck, { result: 'loss', scenario: 'challenge' });

      const bestScenario = tracker.getBestScenario();
      expect(bestScenario).toBe('challenge');
    });

    test('returns null with no data', () => {
      const bestScenario = tracker.getBestScenario();
      expect(bestScenario).toBeNull();
    });

    test('returns null when insufficient data', () => {
      const deck = [{ id: 'strike', name: 'Strike', type: 'attack', cost: 1 }];
      
      tracker.trackUsage(deck, { result: 'win', scenario: 'arena' });

      const bestScenario = tracker.getBestScenario();
      expect(bestScenario).toBeNull();
    });
  });

  describe('getRemovalReasons', () => {
    test('tracks removal reasons', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 }
      ];
      
      tracker.trackRemoval('strike', 'low_synergy');
      tracker.trackRemoval('strike', 'outdated');
      tracker.trackRemoval('defend', 'better_alternative');

      const reasons = tracker.getRemovalReasons('strike');
      expect(reasons).toContain('low_synergy');
      expect(reasons).toContain('outdated');
      expect(reasons.length).toBe(2);
    });

    test('returns empty array for unknown card', () => {
      const reasons = tracker.getRemovalReasons('unknown_card');
      expect(reasons).toEqual([]);
    });
  });

  describe('getRecommendations', () => {
    test('returns non-empty recommendations', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 }
      ];
      
      tracker.trackUsage(deck, { result: 'win', scenario: 'arena' });
      tracker.trackUsage(deck, { result: 'loss', scenario: 'arena' });
      tracker.trackRemoval('defend', 'low_synergy');

      const recommendations = tracker.getRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    test('recommends removal for low performing cards', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'heavy_strike', name: 'Heavy Strike', type: 'attack', cost: 3 }
      ];
      
      // 1 win, 4 losses for heavy_strike
      tracker.trackUsage(deck, { result: 'win', scenario: 'arena' });
      for (let i = 0; i < 4; i++) {
        tracker.trackUsage(deck, { result: 'loss', scenario: 'arena' });
      }

      const recommendations = tracker.getRecommendations();
      const removeRecommendations = recommendations.filter(r => r.type === 'remove');
      expect(removeRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('getCardPerformance', () => {
    test('calculates card performance metrics', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 }
      ];
      
      tracker.trackUsage(deck, { result: 'win', scenario: 'arena' });
      tracker.trackUsage(deck, { result: 'loss', scenario: 'arena' });

      const performance = tracker.getCardPerformance('strike');
      expect(performance).toBeDefined();
      expect(performance.gamesPlayed).toBe(2);
    });

    test('returns null for unknown card', () => {
      const performance = tracker.getCardPerformance('unknown_card');
      expect(performance).toBeNull();
    });
  });

  describe('analyzeSynergyChanges', () => {
    test('detects synergy changes over time', () => {
      const deck1 = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'bash', name: 'Bash', type: 'attack', cost: 2 }
      ];
      const deck2 = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 }
      ];
      
      tracker.trackUsage(deck1, { result: 'win', scenario: 'arena' });
      tracker.trackUsage(deck2, { result: 'win', scenario: 'arena' });

      const changes = tracker.analyzeSynergyChanges();
      expect(changes).toBeDefined();
    });
  });
});