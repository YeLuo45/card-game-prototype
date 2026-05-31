/**
 * Card Gallery Tests
 * V287 - Iteration 8/9 - Card Gallery & Lore System
 */

const { CardGallery } = require('../../src/card-gallery');

describe('CardGallery', () => {
  let gallery;
  const mockCards = [
    { id: 'c1', name: 'Card 1', rarity: 'common', set: 'core', type: 'warrior' },
    { id: 'c2', name: 'Card 2', rarity: 'common', set: 'core', type: 'mage' },
    { id: 'r1', name: 'Rare 1', rarity: 'rare', set: 'core', type: 'warrior' },
    { id: 'e1', name: 'Epic 1', rarity: 'epic', set: 'expansion', type: 'mage' },
    { id: 'l1', name: 'Legendary 1', rarity: 'legendary', set: 'expansion', type: 'warrior' }
  ];

  beforeEach(() => {
    gallery = new CardGallery();
  });

  describe('constructor', () => {
    test('initializes with empty card list', () => {
      expect(gallery.getAllCards()).toEqual([]);
    });

    test('initializes filter state', () => {
      expect(gallery.filters).toBeDefined();
      expect(gallery.viewMode).toBe('grid');
    });
  });

  describe('setCards', () => {
    test('sets the card collection', () => {
      gallery.setCards(mockCards);
      expect(gallery.getAllCards()).toHaveLength(5);
    });

    test('replaces existing cards', () => {
      gallery.setCards(mockCards.slice(0, 2));
      gallery.setCards(mockCards);
      expect(gallery.getAllCards()).toHaveLength(5);
    });
  });

  describe('getAllCards', () => {
    test('returns all cards when no filter applied', () => {
      gallery.setCards(mockCards);
      expect(gallery.getAllCards()).toHaveLength(5);
    });
  });

  describe('filterByRarity', () => {
    test('filters cards by rarity', () => {
      gallery.setCards(mockCards);
      const rareCards = gallery.filterByRarity('rare');
      expect(rareCards).toHaveLength(1);
      expect(rareCards[0].rarity).toBe('rare');
    });

    test('returns empty array for unknown rarity', () => {
      gallery.setCards(mockCards);
      const result = gallery.filterByRarity('mythic');
      expect(result).toEqual([]);
    });
  });

  describe('filterBySet', () => {
    test('filters cards by set', () => {
      gallery.setCards(mockCards);
      const coreCards = gallery.filterBySet('core');
      expect(coreCards).toHaveLength(3);
      expect(coreCards.every(c => c.set === 'core')).toBe(true);
    });

    test('returns empty array for unknown set', () => {
      gallery.setCards(mockCards);
      const result = gallery.filterBySet('nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('filterByType', () => {
    test('filters cards by type', () => {
      gallery.setCards(mockCards);
      const warriorCards = gallery.filterByType('warrior');
      expect(warriorCards).toHaveLength(3);
      expect(warriorCards.every(c => c.type === 'warrior')).toBe(true);
    });
  });

  describe('searchCards', () => {
    test('finds cards by name', () => {
      gallery.setCards(mockCards);
      const results = gallery.searchCards('Rare');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Rare 1');
    });

    test('returns empty array for no matches', () => {
      gallery.setCards(mockCards);
      const results = gallery.searchCards('xyz123');
      expect(results).toEqual([]);
    });

    test('is case insensitive', () => {
      gallery.setCards(mockCards);
      const results = gallery.searchCards('card');
      expect(results).toHaveLength(2);
    });
  });

  describe('setViewMode', () => {
    test('sets grid view mode', () => {
      gallery.setViewMode('grid');
      expect(gallery.viewMode).toBe('grid');
    });

    test('sets list view mode', () => {
      gallery.setViewMode('list');
      expect(gallery.viewMode).toBe('list');
    });

    test('defaults to grid for invalid mode', () => {
      gallery.setViewMode('invalid');
      expect(gallery.viewMode).toBe('grid');
    });
  });

  describe('getViewMode', () => {
    test('returns current view mode', () => {
      gallery.setViewMode('list');
      expect(gallery.getViewMode()).toBe('list');
    });
  });

  describe('getFilteredCards', () => {
    test('returns filtered cards based on current filters', () => {
      gallery.setCards(mockCards);
      gallery.applyFilter('rarity', 'rare');
      const filtered = gallery.getFilteredCards();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].rarity).toBe('rare');
    });

    test('returns all cards when no filters applied', () => {
      gallery.setCards(mockCards);
      expect(gallery.getFilteredCards()).toHaveLength(5);
    });
  });

  describe('clearFilters', () => {
    test('clears all active filters', () => {
      gallery.setCards(mockCards);
      gallery.filterByRarity('rare');
      gallery.clearFilters();
      expect(gallery.getFilteredCards()).toHaveLength(5);
    });
  });

  describe('sortCards', () => {
    test('sorts cards by name', () => {
      gallery.setCards(mockCards);
      gallery.sortCards('name');
      const sorted = gallery.getAllCards();
      expect(sorted[0].name).toBe('Card 1');
      // Alphabetically L < R, so Legendary comes before Rare
      expect(sorted[sorted.length - 1].name).toBe('Rare 1');
    });

    test('sorts cards by rarity', () => {
      gallery.setCards(mockCards);
      gallery.sortCards('rarity');
      const sorted = gallery.getAllCards();
      expect(sorted[0].rarity).toBe('common');
    });

    test('uses descending order when specified', () => {
      gallery.setCards(mockCards);
      gallery.sortCards('name', 'desc');
      const sorted = gallery.getAllCards();
      // In descending order, 'Rare 1' should come first since R > L > E > C
      expect(sorted[0].name).toBe('Rare 1');
    });
  });

  describe('getCardById', () => {
    test('returns card by ID', () => {
      gallery.setCards(mockCards);
      const card = gallery.getCardById('r1');
      expect(card).toBeDefined();
      expect(card.name).toBe('Rare 1');
    });

    test('returns undefined for unknown ID', () => {
      gallery.setCards(mockCards);
      const card = gallery.getCardById('unknown');
      expect(card).toBeUndefined();
    });
  });

  describe('getCardCount', () => {
    test('returns total card count', () => {
      gallery.setCards(mockCards);
      expect(gallery.getCardCount()).toBe(5);
    });

    test('returns 0 when no cards', () => {
      expect(gallery.getCardCount()).toBe(0);
    });
  });

  describe('getCardsByRarityDistribution', () => {
    test('returns correct counts per rarity', () => {
      gallery.setCards(mockCards);
      const dist = gallery.getCardsByRarityDistribution();
      expect(dist.common).toBe(2);
      expect(dist.rare).toBe(1);
      expect(dist.epic).toBe(1);
      expect(dist.legendary).toBe(1);
    });
  });
});