/**
 * Lore Unlock System Tests
 * V287 - Iteration 8/9 - Card Gallery & Lore System
 */

const { LoreUnlockSystem } = require('../../src/lore-unlock-system');

describe('LoreUnlockSystem', () => {
  let unlockSystem;

  beforeEach(() => {
    unlockSystem = new LoreUnlockSystem();
  });

  describe('constructor', () => {
    test('initializes with empty unlocked lore', () => {
      expect(unlockSystem.getUnlockedLore()).toEqual([]);
    });

    test('initializes unlock conditions', () => {
      expect(unlockSystem.unlockConditions).toBeDefined();
      expect(typeof unlockSystem.unlockConditions).toBe('object');
    });

    test('initializes progress tracking', () => {
      expect(unlockSystem.progress).toBeDefined();
    });
  });

  describe('unlockLore', () => {
    test('unlocks lore for a card', () => {
      unlockSystem.unlockLore('card1');
      expect(unlockSystem.isLoreUnlocked('card1')).toBe(true);
    });

    test('returns false when lore already unlocked', () => {
      unlockSystem.unlockLore('card1');
      const result = unlockSystem.unlockLore('card1');
      expect(result).toBe(false);
    });

    test('can unlock multiple lore entries', () => {
      unlockSystem.unlockLore('card1');
      unlockSystem.unlockLore('card2');
      expect(unlockSystem.getUnlockedLore()).toHaveLength(2);
    });
  });

  describe('isLoreUnlocked', () => {
    test('returns true for unlocked lore', () => {
      unlockSystem.unlockLore('card1');
      expect(unlockSystem.isLoreUnlocked('card1')).toBe(true);
    });

    test('returns false for locked lore', () => {
      expect(unlockSystem.isLoreUnlocked('unknown_card')).toBe(false);
    });
  });

  describe('getUnlockedLore', () => {
    test('returns array of unlocked card IDs', () => {
      unlockSystem.unlockLore('card1');
      unlockSystem.unlockLore('card2');
      const unlocked = unlockSystem.getUnlockedLore();
      expect(unlocked).toContain('card1');
      expect(unlocked).toContain('card2');
    });

    test('returns empty array when nothing unlocked', () => {
      expect(unlockSystem.getUnlockedLore()).toEqual([]);
    });
  });

  describe('lockLore', () => {
    test('locks already unlocked lore', () => {
      unlockSystem.unlockLore('card1');
      unlockSystem.lockLore('card1');
      expect(unlockSystem.isLoreUnlocked('card1')).toBe(false);
    });

    test('returns true when lore was locked', () => {
      unlockSystem.unlockLore('card1');
      expect(unlockSystem.lockLore('card1')).toBe(true);
    });

    test('returns false when lore was not unlocked', () => {
      expect(unlockSystem.lockLore('card1')).toBe(false);
    });
  });

  describe('addUnlockCondition', () => {
    test('adds an unlock condition for a card', () => {
      unlockSystem.addUnlockCondition('card1', 'collect_3_cards');
      const conditions = unlockSystem.getUnlockConditions('card1');
      expect(conditions).toContain('collect_3_cards');
    });

    test('adds multiple conditions', () => {
      unlockSystem.addUnlockCondition('card1', 'condition1');
      unlockSystem.addUnlockCondition('card1', 'condition2');
      const conditions = unlockSystem.getUnlockConditions('card1');
      expect(conditions).toHaveLength(2);
    });
  });

  describe('getUnlockConditions', () => {
    test('returns conditions for a card with lore', () => {
      unlockSystem.addUnlockCondition('card1', 'own_rare_card');
      const conditions = unlockSystem.getUnlockConditions('card1');
      expect(conditions).toContain('own_rare_card');
    });

    test('returns empty array for card without conditions', () => {
      const conditions = unlockSystem.getUnlockConditions('unknown');
      expect(conditions).toEqual([]);
    });
  });

  describe('checkUnlockConditions', () => {
    test('returns true when all conditions met', () => {
      unlockSystem.addUnlockCondition('card1', 'condition1');
      unlockSystem.addUnlockCondition('card1', 'condition2');
      
      const result = unlockSystem.checkUnlockConditions('card1', {
        condition1: true,
        condition2: true
      });
      expect(result).toBe(true);
    });

    test('returns false when any condition not met', () => {
      unlockSystem.addUnlockCondition('card1', 'condition1');
      unlockSystem.addUnlockCondition('card1', 'condition2');
      
      const result = unlockSystem.checkUnlockConditions('card1', {
        condition1: true,
        condition2: false
      });
      expect(result).toBe(false);
    });

    test('returns true when no conditions defined', () => {
      const result = unlockSystem.checkUnlockConditions('unknown_card', {});
      expect(result).toBe(true);
    });
  });

  describe('getUnlockProgress', () => {
    test('returns progress for a card', () => {
      unlockSystem.addUnlockCondition('card1', 'condition1');
      unlockSystem.addUnlockCondition('card1', 'condition2');
      
      const progress = unlockSystem.getUnlockProgress('card1', {
        condition1: true,
        condition2: false
      });
      
      expect(progress.total).toBe(2);
      expect(progress.completed).toBe(1);
      expect(progress.percentage).toBeCloseTo(50, 1);
    });

    test('returns 100% when all conditions met', () => {
      unlockSystem.addUnlockCondition('card1', 'condition1');
      const progress = unlockSystem.getUnlockProgress('card1', { condition1: true });
      expect(progress.percentage).toBe(100);
    });

    test('returns 0% when no conditions met', () => {
      unlockSystem.addUnlockCondition('card1', 'condition1');
      unlockSystem.addUnlockCondition('card1', 'condition2');
      const progress = unlockSystem.getUnlockProgress('card1', {});
      expect(progress.percentage).toBe(0);
    });
  });

  describe('getTotalUnlockProgress', () => {
    test('returns overall unlock progress', () => {
      unlockSystem.unlockLore('card1');
      unlockSystem.unlockLore('card2');
      unlockSystem.unlockLore('card3');
      
      const progress = unlockSystem.getTotalUnlockProgress(5);
      expect(progress.unlocked).toBe(3);
      expect(progress.total).toBe(5);
      expect(progress.percentage).toBe(60);
    });

    test('returns 0% when nothing unlocked', () => {
      const progress = unlockSystem.getTotalUnlockProgress(10);
      expect(progress.percentage).toBe(0);
    });

    test('returns 100% when all unlocked', () => {
      unlockSystem.unlockLore('card1');
      const progress = unlockSystem.getTotalUnlockProgress(1);
      expect(progress.percentage).toBe(100);
    });
  });

  describe('reset', () => {
    test('resets all unlocked lore', () => {
      unlockSystem.unlockLore('card1');
      unlockSystem.unlockLore('card2');
      unlockSystem.reset();
      expect(unlockSystem.getUnlockedLore()).toEqual([]);
    });

    test('resets progress tracking', () => {
      unlockSystem.reset();
      expect(unlockSystem.getTotalUnlockProgress(10).unlocked).toBe(0);
    });
  });

  describe('isLoreHidden', () => {
    test('returns true for hidden lore', () => {
      unlockSystem.hideLore('card1');
      expect(unlockSystem.isLoreHidden('card1')).toBe(true);
    });

    test('returns false for revealed lore', () => {
      unlockSystem.hideLore('card1');
      unlockSystem.revealLore('card1');
      expect(unlockSystem.isLoreHidden('card1')).toBe(false);
    });
  });

  describe('hideLore / revealLore', () => {
    test('hides lore content', () => {
      unlockSystem.hideLore('card1');
      expect(unlockSystem.isLoreHidden('card1')).toBe(true);
    });

    test('reveals hidden lore', () => {
      unlockSystem.hideLore('card1');
      unlockSystem.revealLore('card1');
      expect(unlockSystem.isLoreHidden('card1')).toBe(false);
    });
  });

  describe('bulkUnlock', () => {
    test('unlocks multiple lore entries', () => {
      unlockSystem.bulkUnlock(['card1', 'card2', 'card3']);
      expect(unlockSystem.getUnlockedLore()).toHaveLength(3);
      expect(unlockSystem.isLoreUnlocked('card1')).toBe(true);
      expect(unlockSystem.isLoreUnlocked('card2')).toBe(true);
      expect(unlockSystem.isLoreUnlocked('card3')).toBe(true);
    });

    test('handles empty array', () => {
      unlockSystem.bulkUnlock([]);
      expect(unlockSystem.getUnlockedLore()).toEqual([]);
    });
  });

  describe('getLockedLore', () => {
    test('returns card IDs that are still locked', () => {
      unlockSystem.unlockLore('card1');
      const locked = unlockSystem.getLockedLore(['card1', 'card2', 'card3']);
      expect(locked).toContain('card2');
      expect(locked).toContain('card3');
      expect(locked).not.toContain('card1');
    });
  });
});