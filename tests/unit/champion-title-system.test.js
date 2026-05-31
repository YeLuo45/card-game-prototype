/**
 * Champion Title System Tests
 * Tests ChampionTitleSystem: title granting / title levels / display
 */

const { ChampionTitleSystem } = require('../../src/champion-title-system.js');

describe('ChampionTitleSystem', () => {
  let titleSystem;

  beforeEach(() => {
    titleSystem = new ChampionTitleSystem();
  });

  describe('constructor', () => {
    test('initializes with default title levels', () => {
      expect(titleSystem.titleLevels).toBeDefined();
      expect(titleSystem.titleLevels.bronze).toBeDefined();
      expect(titleSystem.titleLevels.silver).toBeDefined();
      expect(titleSystem.titleLevels.gold).toBeDefined();
      expect(titleSystem.titleLevels.diamond).toBeDefined();
      expect(titleSystem.titleLevels.master).toBeDefined();
    });

    test('initializes with empty player titles', () => {
      expect(titleSystem.playerTitles).toEqual(new Map());
    });
  });

  describe('grantTitle', () => {
    test('grants bronze title to player', () => {
      const result = titleSystem.grantTitle('player1', 'bronze');

      expect(result).toBe(true);
      expect(titleSystem.getTitle('player1')).toBe('bronze');
    });

    test('grants silver title to player', () => {
      titleSystem.grantTitle('player1', 'silver');

      expect(titleSystem.getTitle('player1')).toBe('silver');
    });

    test('grants gold title to player', () => {
      titleSystem.grantTitle('player1', 'gold');

      expect(titleSystem.getTitle('player1')).toBe('gold');
    });

    test('grants diamond title to player', () => {
      titleSystem.grantTitle('player1', 'diamond');

      expect(titleSystem.getTitle('player1')).toBe('diamond');
    });

    test('grants master title to player', () => {
      titleSystem.grantTitle('player1', 'master');

      expect(titleSystem.getTitle('player1')).toBe('master');
    });

    test('does not grant invalid title level', () => {
      const result = titleSystem.grantTitle('player1', 'invalid');

      expect(result).toBe(false);
      expect(titleSystem.getTitle('player1')).toBeNull();
    });

    test('upgrades existing title', () => {
      titleSystem.grantTitle('player1', 'bronze');
      titleSystem.grantTitle('player1', 'silver');

      expect(titleSystem.getTitle('player1')).toBe('silver');
    });
  });

  describe('getTitle', () => {
    test('returns null for player without title', () => {
      expect(titleSystem.getTitle('player1')).toBeNull();
    });

    test('returns title for player with title', () => {
      titleSystem.grantTitle('player1', 'gold');

      expect(titleSystem.getTitle('player1')).toBe('gold');
    });
  });

  describe('getTitleLevel', () => {
    test('returns correct level for bronze', () => {
      expect(titleSystem.getTitleLevel('bronze')).toBe(1);
    });

    test('returns correct level for silver', () => {
      expect(titleSystem.getTitleLevel('silver')).toBe(2);
    });

    test('returns correct level for gold', () => {
      expect(titleSystem.getTitleLevel('gold')).toBe(3);
    });

    test('returns correct level for diamond', () => {
      expect(titleSystem.getTitleLevel('diamond')).toBe(4);
    });

    test('returns correct level for master', () => {
      expect(titleSystem.getTitleLevel('master')).toBe(5);
    });

    test('returns 0 for invalid title', () => {
      expect(titleSystem.getTitleLevel('invalid')).toBe(0);
    });
  });

  describe('canUpgrade', () => {
    test('returns true when upgrade is possible', () => {
      titleSystem.grantTitle('player1', 'bronze');

      expect(titleSystem.canUpgrade('player1')).toBe(true);
    });

    test('returns false for master title', () => {
      titleSystem.grantTitle('player1', 'master');

      expect(titleSystem.canUpgrade('player1')).toBe(false);
    });

    test('returns false for player without title', () => {
      expect(titleSystem.canUpgrade('player1')).toBe(false);
    });
  });

  describe('upgradeTitle', () => {
    test('upgrades bronze to silver', () => {
      titleSystem.grantTitle('player1', 'bronze');
      const result = titleSystem.upgradeTitle('player1');

      expect(result).toBe(true);
      expect(titleSystem.getTitle('player1')).toBe('silver');
    });

    test('upgrades silver to gold', () => {
      titleSystem.grantTitle('player1', 'silver');
      titleSystem.upgradeTitle('player1');

      expect(titleSystem.getTitle('player1')).toBe('gold');
    });

    test('upgrades gold to diamond', () => {
      titleSystem.grantTitle('player1', 'gold');
      titleSystem.upgradeTitle('player1');

      expect(titleSystem.getTitle('player1')).toBe('diamond');
    });

    test('upgrades diamond to master', () => {
      titleSystem.grantTitle('player1', 'diamond');
      titleSystem.upgradeTitle('player1');

      expect(titleSystem.getTitle('player1')).toBe('master');
    });

    test('does not upgrade master', () => {
      titleSystem.grantTitle('player1', 'master');
      const result = titleSystem.upgradeTitle('player1');

      expect(result).toBe(false);
      expect(titleSystem.getTitle('player1')).toBe('master');
    });

    test('returns false for player without title', () => {
      const result = titleSystem.upgradeTitle('player1');

      expect(result).toBe(false);
    });
  });

  describe('getTitleDisplay', () => {
    test('returns formatted display string for titled player', () => {
      titleSystem.grantTitle('player1', 'gold');

      const display = titleSystem.getTitleDisplay('player1');
      expect(display).toContain('Gold');
    });

    test('returns empty string for untitled player', () => {
      const display = titleSystem.getTitleDisplay('player1');
      expect(display).toBe('');
    });

    test('includes title icon', () => {
      titleSystem.grantTitle('player1', 'diamond');

      const display = titleSystem.getTitleDisplay('player1');
      expect(display).toContain('◆');
    });
  });

  describe('getAllTitles', () => {
    test('returns all player titles', () => {
      titleSystem.grantTitle('player1', 'bronze');
      titleSystem.grantTitle('player2', 'gold');

      const titles = titleSystem.getAllTitles();

      expect(titles.size).toBe(2);
      expect(titles.get('player1')).toBe('bronze');
      expect(titles.get('player2')).toBe('gold');
    });

    test('returns empty map when no titles', () => {
      const titles = titleSystem.getAllTitles();
      expect(titles.size).toBe(0);
    });
  });

  describe('removeTitle', () => {
    test('removes title from player', () => {
      titleSystem.grantTitle('player1', 'gold');
      titleSystem.removeTitle('player1');

      expect(titleSystem.getTitle('player1')).toBeNull();
    });

    test('handles removal of non-existent title', () => {
      const result = titleSystem.removeTitle('player1');
      expect(result).toBe(false);
    });
  });
});