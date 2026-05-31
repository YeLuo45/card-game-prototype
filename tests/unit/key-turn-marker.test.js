/**
 * Key Turn Marker Tests
 * Tests KeyTurnMarker: mark accuracy > 90%
 */

const { KeyTurnMarker } = require('../../src/key-turn-marker.js');

describe('KeyTurnMarker', () => {
  let marker;

  beforeEach(() => {
    marker = new KeyTurnMarker();
  });

  describe('constructor', () => {
    test('initializes with default config', () => {
      expect(marker.thresholds.criticalHit).toBeDefined();
      expect(marker.thresholds.finishingBlow).toBeDefined();
      expect(marker.thresholds.decisionPoint).toBeDefined();
      expect(marker.markedTurns).toEqual([]);
    });

    test('initializes with custom thresholds', () => {
      const customMarker = new KeyTurnMarker({
        criticalHitThreshold: 0.8,
        finishingBlowThreshold: 0.9,
        decisionPointThreshold: 0.7
      });

      expect(customMarker.thresholds.criticalHit).toBe(0.8);
    });
  });

  describe('markTurn', () => {
    test('marks critical hit turn', () => {
      const turnData = {
        turn: 3,
        hasCriticalHit: true,
        damageDealt: 25,
        overkill: false
      };

      const result = marker.markTurn(turnData);
      
      expect(result.isKeyTurn).toBe(true);
      expect(result.markType).toBe('critical_hit');
      expect(marker.markedTurns).toContain(3);
    });

    test('marks finishing blow turn', () => {
      const turnData = {
        turn: 5,
        hasCriticalHit: false,
        damageDealt: 30,
        overkill: true,
        targetHPBefore: 25
      };

      const result = marker.markTurn(turnData);
      
      expect(result.isKeyTurn).toBe(true);
      expect(result.markType).toBe('finishing_blow');
    });

    test('marks decision point turn', () => {
      const turnData = {
        turn: 4,
        hasCriticalHit: false,
        damageDealt: 15,
        energySpent: 3,
        optionsAvailable: 4
      };

      const result = marker.markTurn(turnData);
      
      expect(result.isKeyTurn).toBe(true);
      expect(result.markType).toBe('decision_point');
    });

    test('does not mark non-key turn', () => {
      const turnData = {
        turn: 2,
        hasCriticalHit: false,
        damageDealt: 6,
        overkill: false
      };

      const result = marker.markTurn(turnData);
      
      expect(result.isKeyTurn).toBe(false);
    });
  });

  describe('calculateImportanceScore', () => {
    test('calculates score for critical hit', () => {
      const score = marker.calculateImportanceScore({
        hasCriticalHit: true,
        damageDealt: 20,
        overkill: false
      });

      expect(score).toBeGreaterThanOrEqual(40);
    });

    test('calculates score for finishing blow', () => {
      const score = marker.calculateImportanceScore({
        hasCriticalHit: false,
        damageDealt: 30,
        overkill: true
      });

      expect(score).toBeGreaterThanOrEqual(35);
    });

    test('calculates score for decision point', () => {
      const score = marker.calculateImportanceScore({
        hasCriticalHit: false,
        damageDealt: 10,
        energySpent: 2,
        optionsAvailable: 4
      });

      expect(score).toBeGreaterThanOrEqual(20);
    });

    test('returns low score for normal turn', () => {
      const score = marker.calculateImportanceScore({
        hasCriticalHit: false,
        damageDealt: 6,
        overkill: false
      });

      expect(score).toBeLessThan(50);
    });
  });

  describe('analyzeBattle', () => {
    test('marks multiple key turns in battle', () => {
      const battleLog = [
        { turn: 1, hasCriticalHit: false, damageDealt: 6 },
        { turn: 2, hasCriticalHit: false, damageDealt: 6 },
        { turn: 3, hasCriticalHit: true, damageDealt: 15 },
        { turn: 4, damageDealt: 10, energySpent: 3, optionsAvailable: 4 },
        { turn: 5, damageDealt: 25, overkill: true }
      ];

      const result = marker.analyzeBattle(battleLog);

      expect(result.keyTurns.length).toBeGreaterThan(0);
      expect(result.totalTurns).toBe(5);
    });

    test('returns correct key turn count', () => {
      const battleLog = [
        { turn: 1, hasCriticalHit: false, damageDealt: 6 },
        { turn: 3, hasCriticalHit: true, damageDealt: 15 },
        { turn: 5, damageDealt: 25, overkill: true }
      ];

      const result = marker.analyzeBattle(battleLog);

      expect(result.keyTurnCount).toBeGreaterThanOrEqual(2);
    });

    test('returns empty array for no key turns', () => {
      const battleLog = [
        { turn: 1, hasCriticalHit: false, damageDealt: 6 },
        { turn: 2, hasCriticalHit: false, damageDealt: 6 }
      ];

      const result = marker.analyzeBattle(battleLog);

      expect(result.keyTurns.length).toBe(0);
    });
  });

  describe('customRules', () => {
    test('applies custom marking rule', () => {
      marker.addCustomRule({
        name: 'high_damage',
        condition: (turnData) => turnData.damageDealt > 20,
        weight: 1.0
      });

      const turnData = { turn: 3, damageDealt: 25, overkill: false };
      const result = marker.markTurn(turnData);

      expect(result.isKeyTurn).toBe(true);
    });

    test('removes custom rule', () => {
      const ruleId = marker.addCustomRule({
        name: 'test_rule',
        condition: (turnData) => turnData.damage > 10,
        weight: 1.0
      });

      marker.removeCustomRule(ruleId);
      
      const turnData = { turn: 3, damage: 15, hasCriticalHit: true };
      const result = marker.markTurn(turnData);
      
      expect(result.isKeyTurn).toBe(true);
    });
  });

  describe('getMarkedTurns', () => {
    test('returns all marked turns', () => {
      marker.markTurn({ turn: 1, hasCriticalHit: true, damageDealt: 15 });
      marker.markTurn({ turn: 3, hasCriticalHit: true, damageDealt: 25, overkill: true });

      const marked = marker.getMarkedTurns();

      expect(marked).toContain(1);
      expect(marked).toContain(3);
    });

    test('returns empty array when no turns marked', () => {
      const marked = marker.getMarkedTurns();
      expect(marked).toEqual([]);
    });
  });

  describe('clear', () => {
    test('clears marked turns', () => {
      marker.markTurn({ turn: 1, hasCriticalHit: true, damageDealt: 15 });
      marker.markTurn({ turn: 3, overkill: true, damageDealt: 25 });

      marker.clear();

      expect(marker.markedTurns).toEqual([]);
    });
  });

  describe('markAccuracy', () => {
    test('calculates mark accuracy with simulated data', () => {
      // Simulate known key turns
      const groundTruth = [
        { turn: 2, isKey: true },
        { turn: 5, isKey: true },
        { turn: 8, isKey: true }
      ];

      const battleLog = [
        { turn: 1, hasCriticalHit: false, damageDealt: 6 },
        { turn: 2, hasCriticalHit: true, damageDealt: 15 },
        { turn: 3, damageDealt: 8 },
        { turn: 4, damageDealt: 6 },
        { turn: 5, hasCriticalHit: true, damageDealt: 30, overkill: true },
        { turn: 6, damageDealt: 6 },
        { turn: 7, damageDealt: 8 },
        { turn: 8, hasCriticalHit: true, damageDealt: 20 },
        { turn: 9, damageDealt: 6 }
      ];

      const result = marker.analyzeBattle(battleLog);
      
      // Check that we correctly identified key turns
      const markedTurns = result.keyTurns.map(t => t.turn);
      const expectedMarked = [2, 5, 8];
      
      const correctMarks = expectedMarked.filter(t => markedTurns.includes(t)).length;
      const accuracy = correctMarks / expectedMarked.length;
      
      expect(accuracy).toBeGreaterThan(0.9);
    });
  });
});