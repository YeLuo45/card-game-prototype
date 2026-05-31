/**
 * Card Lore Database Tests
 * V287 - Iteration 8/9 - Card Gallery & Lore System
 */

const { CardLoreDatabase } = require('../../src/card-lore-database');

describe('CardLoreDatabase', () => {
  let db;

  beforeEach(() => {
    db = new CardLoreDatabase();
  });

  describe('constructor', () => {
    test('creates empty lore entries', () => {
      expect(db.getAllLore()).toEqual([]);
    });

    test('initializes lore data structure', () => {
      expect(db.loreData).toBeDefined();
      expect(typeof db.loreData).toBe('object');
    });
  });

  describe('addLoreEntry', () => {
    test('adds a lore entry for a card', () => {
      const loreEntry = {
        cardId: 'card1',
        title: 'Origin Story',
        content: 'Once upon a time...',
        category: 'background'
      };
      db.addLoreEntry(loreEntry);
      const entry = db.getLoreEntry('card1');
      expect(entry).toBeDefined();
      expect(entry.title).toBe('Origin Story');
    });

    test('returns false when adding duplicate entry', () => {
      db.addLoreEntry({ cardId: 'card1', title: 'Story', content: 'Content' });
      const result = db.addLoreEntry({ cardId: 'card1', title: 'Story2', content: 'Content2' });
      expect(result).toBe(false);
    });

    test('adds multiple lore entries for different cards', () => {
      db.addLoreEntry({ cardId: 'card1', title: 'Story 1', content: 'Content 1' });
      db.addLoreEntry({ cardId: 'card2', title: 'Story 2', content: 'Content 2' });
      expect(db.getAllLore()).toHaveLength(2);
    });
  });

  describe('getLoreEntry', () => {
    test('returns lore entry for known card', () => {
      db.addLoreEntry({
        cardId: 'card1',
        title: 'Hero Backstory',
        content: 'Hero grew up in the mountains.',
        category: 'background'
      });
      const entry = db.getLoreEntry('card1');
      expect(entry).toBeDefined();
      expect(entry.cardId).toBe('card1');
    });

    test('returns undefined for unknown card', () => {
      const entry = db.getLoreEntry('unknown_card');
      expect(entry).toBeUndefined();
    });
  });

  describe('getLoreByCategory', () => {
    test('returns entries filtered by category', () => {
      db.addLoreEntry({ cardId: 'card1', title: 'T1', content: 'C1', category: 'background' });
      db.addLoreEntry({ cardId: 'card2', title: 'T2', content: 'C2', category: 'character' });
      db.addLoreEntry({ cardId: 'card3', title: 'T3', content: 'C3', category: 'background' });
      
      const backgroundLore = db.getLoreByCategory('background');
      expect(backgroundLore).toHaveLength(2);
      expect(backgroundLore.every(e => e.category === 'background')).toBe(true);
    });

    test('returns empty array for unknown category', () => {
      const result = db.getLoreByCategory('nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('addCharacterRelationship', () => {
    test('adds a relationship between characters', () => {
      db.addCharacterRelationship('hero1', 'hero2', 'ally');
      const relationships = db.getCharacterRelationships('hero1');
      expect(relationships).toHaveLength(1);
      expect(relationships[0].target).toBe('hero2');
      expect(relationships[0].type).toBe('ally');
    });

    test('adds multiple relationships', () => {
      db.addCharacterRelationship('hero1', 'hero2', 'ally');
      db.addCharacterRelationship('hero1', 'villain1', 'enemy');
      const relationships = db.getCharacterRelationships('hero1');
      expect(relationships).toHaveLength(2);
    });

    test('adds bidirectional relationships when specified', () => {
      db.addCharacterRelationship('hero1', 'hero2', 'sibling', true);
      const hero2Relations = db.getCharacterRelationships('hero2');
      expect(hero2Relations.some(r => r.target === 'hero1')).toBe(true);
    });
  });

  describe('getCharacterRelationships', () => {
    test('returns empty array for character with no relationships', () => {
      const result = db.getCharacterRelationships('unknown');
      expect(result).toEqual([]);
    });

    test('returns all relationships for a character', () => {
      db.addCharacterRelationship('hero1', 'hero2', 'ally');
      db.addCharacterRelationship('hero1', 'hero3', 'friend');
      const result = db.getCharacterRelationships('hero1');
      expect(result).toHaveLength(2);
    });
  });

  describe('addWorldSetting', () => {
    test('adds a world setting entry', () => {
      db.addWorldSetting('kingdom_name', 'Valoria', 'A great kingdom.');
      const setting = db.getWorldSetting('kingdom_name');
      expect(setting).toBeDefined();
      expect(setting.value).toBe('Valoria');
    });

    test('returns undefined for unknown setting', () => {
      const setting = db.getWorldSetting('unknown_setting');
      expect(setting).toBeUndefined();
    });
  });

  describe('getWorldSetting', () => {
    test('returns world setting by key', () => {
      db.addWorldSetting('magic_system', 'Elemental', 'Based on four elements.');
      const setting = db.getWorldSetting('magic_system');
      expect(setting.value).toBe('Elemental');
    });
  });

  describe('getAllLore', () => {
    test('returns all lore entries', () => {
      db.addLoreEntry({ cardId: 'card1', title: 'T1', content: 'C1' });
      db.addLoreEntry({ cardId: 'card2', title: 'T2', content: 'C2' });
      const allLore = db.getAllLore();
      expect(allLore).toHaveLength(2);
    });

    test('returns empty array when no lore entries', () => {
      expect(db.getAllLore()).toEqual([]);
    });
  });

  describe('hasLore', () => {
    test('returns true for card with lore', () => {
      db.addLoreEntry({ cardId: 'card1', title: 'T', content: 'C' });
      expect(db.hasLore('card1')).toBe(true);
    });

    test('returns false for card without lore', () => {
      expect(db.hasLore('unknown_card')).toBe(false);
    });
  });

  describe('searchLore', () => {
    test('finds lore entries by keyword in content', () => {
      db.addLoreEntry({ cardId: 'card1', title: 'T1', content: 'Dragon warrior' });
      db.addLoreEntry({ cardId: 'card2', title: 'T2', content: 'Ice magician' });
      
      const results = db.searchLore('Dragon');
      expect(results).toHaveLength(1);
      expect(results[0].cardId).toBe('card1');
    });

    test('finds lore entries by keyword in title', () => {
      db.addLoreEntry({ cardId: 'card1', title: 'Dragon Knight', content: 'Content' });
      
      const results = db.searchLore('Knight');
      expect(results).toHaveLength(1);
    });

    test('returns empty array for no matches', () => {
      db.addLoreEntry({ cardId: 'card1', title: 'T', content: 'Content' });
      const results = db.searchLore('xyz123');
      expect(results).toEqual([]);
    });

    test('is case insensitive', () => {
      db.addLoreEntry({ cardId: 'card1', title: 'Dragon', content: 'Content' });
      const results = db.searchLore('dragon');
      expect(results).toHaveLength(1);
    });
  });

  describe('clear', () => {
    test('clears all lore entries', () => {
      db.addLoreEntry({ cardId: 'card1', title: 'T', content: 'C' });
      db.addWorldSetting('key', 'value', 'desc');
      db.addCharacterRelationship('char1', 'char2', 'ally');
      
      db.clear();
      
      expect(db.getAllLore()).toEqual([]);
      expect(db.getWorldSetting('key')).toBeUndefined();
      expect(db.getCharacterRelationships('char1')).toEqual([]);
    });
  });

  describe('integration with collection-registry', () => {
    test('filters lore based on owned cards', () => {
      const { CollectionRegistry } = require('../../src/collection-registry');
      
      db.addLoreEntry({ cardId: 'card1', title: 'Owned Card Lore', content: 'Content' });
      db.addLoreEntry({ cardId: 'card2', title: 'Unowned Card Lore', content: 'Content' });
      
      const registry = new CollectionRegistry();
      registry.addCard('card1');
      
      const ownedLore = db.getAllLore().filter(entry => registry.hasCard(entry.cardId));
      expect(ownedLore).toHaveLength(1);
      expect(ownedLore[0].cardId).toBe('card1');
    });
  });
});