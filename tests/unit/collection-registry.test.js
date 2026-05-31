/**
 * Collection Registry Tests
 * V261 - Iteration 6/9 - Card Set Collection Tracker
 */

const {
  CollectionRegistry
} = require('../../src/collection-registry');

describe('CollectionRegistry', () => {
  let registry;
  const allCards = [
    { id: 'c1', name: 'Card 1', rarity: 'common', set: 'core' },
    { id: 'c2', name: 'Card 2', rarity: 'common', set: 'core' },
    { id: 'r1', name: 'Rare 1', rarity: 'rare', set: 'core' },
    { id: 'e1', name: 'Epic 1', rarity: 'epic', set: 'core' },
    { id: 'l1', name: 'Legendary 1', rarity: 'legendary', set: 'core' },
    { id: 'c3', name: 'Card 3', rarity: 'common', set: 'expansion' },
    { id: 'r2', name: 'Rare 2', rarity: 'rare', set: 'expansion' }
  ];

  beforeEach(() => {
    registry = new CollectionRegistry();
  });

  describe('addCard', () => {
    test('adds a single card to collection', () => {
      registry.addCard('c1');
      expect(registry.getOwnedCardIds()).toContain('c1');
    });

    test('adds multiple cards', () => {
      registry.addCard('c1');
      registry.addCard('c2');
      registry.addCard('r1');
      expect(registry.getOwnedCardIds()).toHaveLength(3);
    });

    test('does not add duplicate cards', () => {
      registry.addCard('c1');
      registry.addCard('c1');
      expect(registry.getOwnedCardIds()).toHaveLength(1);
    });

    test('returns true for new card, false for duplicate', () => {
      expect(registry.addCard('c1')).toBe(true);
      expect(registry.addCard('c1')).toBe(false);
    });
  });

  describe('removeCard', () => {
    test('removes a card from collection', () => {
      registry.addCard('c1');
      registry.removeCard('c1');
      expect(registry.getOwnedCardIds()).not.toContain('c1');
    });

    test('returns true when card was owned', () => {
      registry.addCard('c1');
      expect(registry.removeCard('c1')).toBe(true);
    });

    test('returns false when card was not owned', () => {
      expect(registry.removeCard('c1')).toBe(false);
    });
  });

  describe('hasCard', () => {
    test('returns true for owned card', () => {
      registry.addCard('c1');
      expect(registry.hasCard('c1')).toBe(true);
    });

    test('returns false for unowned card', () => {
      expect(registry.hasCard('c1')).toBe(false);
    });
  });

  describe('getOwnedCardIds', () => {
    test('returns array of owned card ids', () => {
      registry.addCard('c1');
      registry.addCard('c2');
      const ids = registry.getOwnedCardIds();
      expect(Array.isArray(ids)).toBe(true);
      expect(ids).toContain('c1');
      expect(ids).toContain('c2');
    });

    test('returns empty array when no cards owned', () => {
      expect(registry.getOwnedCardIds()).toEqual([]);
    });
  });

  describe('getCollectionProgress', () => {
    test('returns 0 when no cards owned', () => {
      const progress = registry.getCollectionProgress(allCards);
      expect(progress.owned).toBe(0);
      expect(progress.total).toBe(7);
      expect(progress.percentage).toBe(0);
    });

    test('calculates correct progress percentage', () => {
      registry.addCard('c1');
      registry.addCard('c2');
      registry.addCard('r1');
      const progress = registry.getCollectionProgress(allCards);
      expect(progress.owned).toBe(3);
      expect(progress.total).toBe(7);
      expect(progress.percentage).toBeCloseTo(42.86, 1);
    });

    test('returns 100 when all cards owned', () => {
      allCards.forEach(card => registry.addCard(card.id));
      const progress = registry.getCollectionProgress(allCards);
      expect(progress.percentage).toBe(100);
    });
  });

  describe('getRarityDistribution', () => {
    test('returns correct counts per rarity', () => {
      registry.addCard('c1');
      registry.addCard('c2');
      registry.addCard('r1');
      registry.addCard('e1');
      registry.addCard('l1');
      
      const dist = registry.getRarityDistribution(allCards);
      expect(dist.common).toBe(2);
      expect(dist.rare).toBe(1);
      expect(dist.epic).toBe(1);
      expect(dist.legendary).toBe(1);
    });

    test('returns zeros when no cards owned', () => {
      const dist = registry.getRarityDistribution(allCards);
      expect(dist.common).toBe(0);
      expect(dist.rare).toBe(0);
      expect(dist.epic).toBe(0);
      expect(dist.legendary).toBe(0);
    });

    test('only counts owned cards in distribution', () => {
      registry.addCard('c1');
      const dist = registry.getRarityDistribution(allCards);
      expect(dist.common).toBe(1);
      expect(dist.rare).toBe(0);
    });
  });

  describe('setAllCards', () => {
    test('sets the complete card pool', () => {
      registry.setAllCards(allCards);
      const progress = registry.getCollectionProgress();
      expect(progress.total).toBe(7);
    });
  });

  describe('reset', () => {
    test('clears all owned cards', () => {
      registry.addCard('c1');
      registry.addCard('c2');
      registry.reset();
      expect(registry.getOwnedCardIds()).toEqual([]);
    });
  });
});