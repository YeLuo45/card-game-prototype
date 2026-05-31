/**
 * Missing Card Recommender Tests
 * V261 - Iteration 6/9 - Card Set Collection Tracker
 */

const {
  MissingCardRecommender
} = require('../../src/missing-card-recommender');

describe('MissingCardRecommender', () => {
  let recommender;
  const allCards = [
    { id: 'c1', name: 'Card 1', rarity: 'common', power: 2, cost: 1, type: 'creature', synergyTags: ['aggro'] },
    { id: 'c2', name: 'Card 2', rarity: 'common', power: 3, cost: 2, type: 'creature', synergyTags: ['aggro', 'defense'] },
    { id: 'r1', name: 'Rare 1', rarity: 'rare', power: 5, cost: 3, type: 'creature', synergyTags: ['control'] },
    { id: 'e1', name: 'Epic 1', rarity: 'epic', power: 7, cost: 5, type: 'creature', synergyTags: ['control', 'late'] },
    { id: 'l1', name: 'Legendary 1', rarity: 'legendary', power: 10, cost: 6, type: 'creature', synergyTags: ['control', 'late'] }
  ];
  const ownedCardIds = ['c1'];

  beforeEach(() => {
    recommender = new MissingCardRecommender();
  });

  describe('getMissingCards', () => {
    test('returns cards not in owned collection', () => {
      const missing = recommender.getMissingCards(allCards, ownedCardIds);
      expect(missing).toHaveLength(4);
      expect(missing.map(c => c.id)).not.toContain('c1');
    });

    test('returns empty array when all cards owned', () => {
      const allOwned = allCards.map(c => c.id);
      const missing = recommender.getMissingCards(allCards, allOwned);
      expect(missing).toHaveLength(0);
    });

    test('returns empty array when no cards available', () => {
      const missing = recommender.getMissingCards([], ownedCardIds);
      expect(missing).toHaveLength(0);
    });
  });

  describe('calculatePriority', () => {
    test('higher power = higher priority', () => {
      const lowPowerCard = { id: 'c1', power: 2, rarity: 'common' };
      const highPowerCard = { id: 'r1', power: 8, rarity: 'rare' };
      
      const lowPriority = recommender.calculatePriority(lowPowerCard);
      const highPriority = recommender.calculatePriority(highPowerCard);
      
      expect(highPriority).toBeGreaterThan(lowPriority);
    });

    test('rarity affects priority', () => {
      const commonCard = { id: 'c1', power: 5, rarity: 'common' };
      const legendaryCard = { id: 'c1', power: 5, rarity: 'legendary' };
      
      const commonPriority = recommender.calculatePriority(commonCard);
      const legendaryPriority = recommender.calculatePriority(legendaryCard);
      
      expect(legendaryPriority).toBeGreaterThan(commonPriority);
    });

    test('synergy count affects priority', () => {
      const noSynergyCard = { id: 'c1', power: 5, rarity: 'common', synergyTags: [] };
      const multiSynergyCard = { id: 'c1', power: 5, rarity: 'common', synergyTags: ['aggro', 'control', 'late'] };
      
      const noSynergyPriority = recommender.calculatePriority(noSynergyCard);
      const multiSynergyPriority = recommender.calculatePriority(multiSynergyCard);
      
      expect(multiSynergyPriority).toBeGreaterThan(noSynergyPriority);
    });

    test('returns base priority for card without special properties', () => {
      const basicCard = { id: 'c1', power: 0, rarity: 'common', synergyTags: [] };
      const priority = recommender.calculatePriority(basicCard);
      expect(typeof priority).toBe('number');
      expect(priority).toBeGreaterThan(0);
    });
  });

  describe('getRecommendations', () => {
    test('returns prioritized list of missing cards', () => {
      const recommendations = recommender.getRecommendations(allCards, ownedCardIds);
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    test('recommendations are sorted by priority descending', () => {
      const recommendations = recommender.getRecommendations(allCards, ownedCardIds);
      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i - 1].priority).toBeGreaterThanOrEqual(recommendations[i].priority);
      }
    });

    test('recommendation includes card and priority', () => {
      const recommendations = recommender.getRecommendations(allCards, ownedCardIds);
      const first = recommendations[0];
      expect(first.card).toBeDefined();
      expect(first.priority).toBeDefined();
      expect(first.reasons).toBeDefined();
    });

    test('respects limit parameter', () => {
      const recommendations = recommender.getRecommendations(allCards, ownedCardIds, { limit: 2 });
      expect(recommendations.length).toBeLessThanOrEqual(2);
    });

    test('respects rarity filter', () => {
      const recommendations = recommender.getRecommendations(allCards, ownedCardIds, { rarity: 'rare' });
      recommendations.forEach(rec => {
        expect(rec.card.rarity).toBe('rare');
      });
    });

    test('respects type filter', () => {
      const recommendations = recommender.getRecommendations(allCards, ownedCardIds, { type: 'creature' });
      recommendations.forEach(rec => {
        expect(rec.card.type).toBe('creature');
      });
    });
  });

  describe('calculateResourceCost', () => {
    test('estimates resources needed for missing cards', () => {
      const missingCards = allCards.filter(c => !ownedCardIds.includes(c.id));
      const cost = recommender.calculateResourceCost(missingCards);
      
      expect(cost.dust).toBeDefined();
      expect(cost.gold).toBeDefined();
      expect(typeof cost.dust).toBe('number');
      expect(typeof cost.gold).toBe('number');
    });

    test('higher rarity costs more dust', () => {
      const commonCard = { id: 'c1', rarity: 'common' };
      const legendaryCard = { id: 'l1', rarity: 'legendary' };
      
      const commonCost = recommender.calculateResourceCost([commonCard]);
      const legendaryCost = recommender.calculateResourceCost([legendaryCard]);
      
      expect(legendaryCost.dust).toBeGreaterThan(commonCost.dust);
    });

    test('returns zero for empty array', () => {
      const cost = recommender.calculateResourceCost([]);
      expect(cost.dust).toBe(0);
      expect(cost.gold).toBe(0);
    });
  });

  describe('getCompletionEstimate', () => {
    test('estimates cards needed to complete collection', () => {
      const estimate = recommender.getCompletionEstimate(allCards, ownedCardIds);
      expect(estimate.missingCount).toBe(4);
      expect(estimate.totalCost).toBeDefined();
      expect(estimate.percentage).toBe(20); // 1/5 = 20%
    });

    test('returns 100% when collection complete', () => {
      const allOwned = allCards.map(c => c.id);
      const estimate = recommender.getCompletionEstimate(allCards, allOwned);
      expect(estimate.percentage).toBe(100);
      expect(estimate.missingCount).toBe(0);
    });
  });
});