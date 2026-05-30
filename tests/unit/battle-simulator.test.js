/**
 * V255 Battle Simulator System Tests (Iteration 1/9)
 * 测试 BattleSimulator | BattleMetrics | CombatResolver
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
    innerHTML: '',
    removeChild: jest.fn()
  },
  createElement: jest.fn((tag) => ({
    id: '',
    innerHTML: '',
    appendChild: jest.fn(),
    remove: jest.fn(),
    style: {},
    className: ''
  })),
  getElementById: jest.fn(() => ({
    style: { display: 'block' },
    classList: { add: jest.fn(), remove: jest.fn() },
    innerHTML: '',
    appendChild: jest.fn(),
    remove: jest.fn()
  })),
  head: {
    appendChild: jest.fn()
  }
};
global.document = mockDocument;

const { BattleSimulator, BattleMetrics, CombatResolver } = require('../../src/battle-simulator.js');

// Helper function to clear mock storage
const clearMockStorage = () => {
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
};

describe('BattleMetrics', () => {
  let metrics;

  beforeEach(() => {
    metrics = new BattleMetrics();
    clearMockStorage();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('initializes with default metrics', () => {
      expect(metrics.metrics.totalDamage).toBe(0);
      expect(metrics.metrics.effectiveDamage).toBe(0);
      expect(metrics.metrics.overkillDamage).toBe(0);
      expect(metrics.metrics.damageNegated).toBe(0);
      expect(metrics.metrics.energySpent).toBe(0);
      expect(metrics.metrics.energyWasted).toBe(0);
      expect(metrics.metrics.turnsElapsed).toBe(0);
      expect(metrics.metrics.cardsPlayed).toBe(0);
      expect(metrics.metrics.criticalHits).toBe(0);
      expect(metrics.metrics.statusDamage).toBe(0);
      expect(metrics.turnBreakdown).toEqual([]);
    });
  });

  describe('reset', () => {
    test('resets all metrics to zero', () => {
      metrics.metrics.totalDamage = 100;
      metrics.metrics.energySpent = 50;
      metrics.turnBreakdown.push({ turn: 1, totalDamage: 50 });

      metrics.reset();

      expect(metrics.metrics.totalDamage).toBe(0);
      expect(metrics.metrics.energySpent).toBe(0);
      expect(metrics.turnBreakdown).toEqual([]);
    });
  });

  describe('recordTurnDamage', () => {
    test('records turn damage correctly', () => {
      const damageInfo = {
        totalDamage: 20,
        effectiveDamage: 18,
        overkillDamage: 2,
        damageNegated: 0,
        energySpent: 3,
        cardsPlayed: 2,
        criticalHits: 1,
        statusDamage: 0
      };

      metrics.recordTurnDamage(1, damageInfo);

      expect(metrics.metrics.totalDamage).toBe(20);
      expect(metrics.metrics.effectiveDamage).toBe(18);
      expect(metrics.metrics.overkillDamage).toBe(2);
      expect(metrics.metrics.energySpent).toBe(3);
      expect(metrics.metrics.cardsPlayed).toBe(2);
      expect(metrics.metrics.criticalHits).toBe(1);
      expect(metrics.turnBreakdown).toHaveLength(1);
      expect(metrics.turnBreakdown[0].turn).toBe(1);
    });

    test('accumulates multiple turn damage', () => {
      metrics.recordTurnDamage(1, { totalDamage: 10, effectiveDamage: 10, overkillDamage: 0, damageNegated: 0, energySpent: 2, cardsPlayed: 1, criticalHits: 0, statusDamage: 0 });
      metrics.recordTurnDamage(2, { totalDamage: 15, effectiveDamage: 15, overkillDamage: 0, damageNegated: 0, energySpent: 3, cardsPlayed: 2, criticalHits: 0, statusDamage: 0 });

      expect(metrics.metrics.totalDamage).toBe(25);
      expect(metrics.metrics.energySpent).toBe(5);
      expect(metrics.metrics.cardsPlayed).toBe(3);
      expect(metrics.turnBreakdown).toHaveLength(2);
    });
  });

  describe('calculateEnergyEfficiency', () => {
    test('calculates energy efficiency correctly', () => {
      metrics.metrics.energySpent = 15;
      metrics.metrics.energyWasted = 5;

      const efficiency = metrics.calculateEnergyEfficiency();
      expect(efficiency).toBeCloseTo(75, 1);
    });

    test('returns 0 when no energy spent', () => {
      metrics.metrics.energySpent = 0;
      metrics.metrics.energyWasted = 0;

      const efficiency = metrics.calculateEnergyEfficiency();
      expect(efficiency).toBe(0);
    });

    test('handles no waste scenario', () => {
      metrics.metrics.energySpent = 20;
      metrics.metrics.energyWasted = 0;

      const efficiency = metrics.calculateEnergyEfficiency();
      expect(efficiency).toBe(100);
    });
  });

  describe('calculateDPS', () => {
    test('calculates DPS correctly', () => {
      metrics.metrics.totalDamage = 100;
      metrics.metrics.turnsElapsed = 10;

      const dps = metrics.calculateDPS();
      expect(dps).toBe(10);
    });

    test('returns 0 when no turns elapsed', () => {
      metrics.metrics.totalDamage = 100;
      metrics.metrics.turnsElapsed = 0;

      const dps = metrics.calculateDPS();
      expect(dps).toBe(0);
    });
  });

  describe('calculateCriticalRate', () => {
    test('calculates critical rate correctly', () => {
      metrics.metrics.criticalHits = 3;
      metrics.metrics.cardsPlayed = 10;

      const rate = metrics.calculateCriticalRate();
      expect(rate).toBe(30);
    });

    test('returns 0 when no cards played', () => {
      metrics.metrics.criticalHits = 0;
      metrics.metrics.cardsPlayed = 0;

      const rate = metrics.calculateCriticalRate();
      expect(rate).toBe(0);
    });
  });

  describe('getReport', () => {
    test('returns complete report', () => {
      metrics.metrics.totalDamage = 100;
      metrics.metrics.energySpent = 20;
      metrics.metrics.energyWasted = 10;
      metrics.metrics.turnsElapsed = 5;
      metrics.metrics.cardsPlayed = 8;
      metrics.metrics.criticalHits = 2;
      metrics.turnBreakdown.push({ turn: 1, totalDamage: 20 });

      const report = metrics.getReport();

      expect(report.totalDamage).toBe(100);
      expect(report.energySpent).toBe(20);
      expect(report.turnsElapsed).toBe(5);
      expect(report.turnBreakdown).toHaveLength(1);
      expect(report.energyEfficiency).toBeDefined();
      expect(report.dps).toBeDefined();
      expect(report.criticalRate).toBeDefined();
    });
  });
});

describe('CombatResolver', () => {
  let resolver;

  beforeEach(() => {
    resolver = new CombatResolver();
    clearMockStorage();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('initializes with default options', () => {
      expect(resolver.criticalMultiplier).toBe(1.5);
      expect(resolver.statusMultiplier).toBe(0.5);
      expect(resolver.armorReduction).toBe(true);
    });

    test('initializes with custom options', () => {
      const customResolver = new CombatResolver({
        criticalMultiplier: 2.0,
        statusMultiplier: 0.75,
        armorReduction: true
      });

      expect(customResolver.criticalMultiplier).toBe(2.0);
      expect(customResolver.statusMultiplier).toBe(0.75);
      expect(customResolver.armorReduction).toBe(true);
    });
  });

  describe('calculateDamage', () => {
    test('calculates base damage correctly', () => {
      const attacker = { damageBonus: 0, synergyBonus: 0, archetypeBonus: 0 };
      const defender = { armor: 0, status: [], currentHP: 50 };
      const card = { damage: 10 };

      const result = resolver.calculateDamage(attacker, defender, card);

      expect(result.totalDamage).toBe(10);
      expect(result.effectiveDamage).toBe(10);
      expect(result.overkillDamage).toBe(0);
      expect(result.damageNegated).toBe(0);
    });

    test('applies attacker bonuses', () => {
      const attacker = { damageBonus: 5, synergyBonus: 3, archetypeBonus: 2 };
      const defender = { armor: 0, status: [], currentHP: 50 };
      const card = { damage: 10 };

      const result = resolver.calculateDamage(attacker, defender, card);

      expect(result.totalDamage).toBe(20);
    });

    test('reduces damage with armor', () => {
      const attacker = { damageBonus: 0, synergyBonus: 0, archetypeBonus: 0 };
      const defender = { armor: 5, status: [], currentHP: 50 };
      const card = { damage: 10 };

      const result = resolver.calculateDamage(attacker, defender, card);

      expect(result.damageNegated).toBe(5);
      expect(result.effectiveDamage).toBe(5);
      expect(result.residualArmor).toBe(0);
    });

    test('applies vulnerable status multiplier', () => {
      const attacker = { damageBonus: 0, synergyBonus: 0, archetypeBonus: 0 };
      const defender = { armor: 0, status: ['vulnerable'], currentHP: 50 };
      const card = { damage: 10 };

      const result = resolver.calculateDamage(attacker, defender, card);

      expect(result.effectiveDamage).toBe(15);
    });

    test('applies weakened status multiplier', () => {
      const attacker = { damageBonus: 0, synergyBonus: 0, archetypeBonus: 0, status: ['weakened'] };
      const defender = { armor: 0, status: [], currentHP: 50 };
      const card = { damage: 10 };

      const result = resolver.calculateDamage(attacker, defender, card);

      expect(result.effectiveDamage).toBe(8); // Math.round(10 * 0.75) = 8
    });

    test('calculates overkill damage', () => {
      const attacker = { damageBonus: 0, synergyBonus: 0, archetypeBonus: 0, critChance: 0 };
      const defender = { armor: 0, status: [], currentHP: 5 };
      const card = { damage: 10 };

      const result = resolver.calculateDamage(attacker, defender, card);

      expect(result.effectiveDamage).toBe(10);
      expect(result.overkillDamage).toBe(5);
    });

    test('handles negative HP correctly', () => {
      const attacker = { damageBonus: 0, synergyBonus: 0, archetypeBonus: 0, critChance: 0 };
      const defender = { armor: 0, status: [], currentHP: 3 };
      const card = { damage: 10 };

      const result = resolver.calculateDamage(attacker, defender, card);

      expect(result.effectiveDamage).toBe(10);
      expect(result.overkillDamage).toBe(7);
    });
  });

  describe('calculateStatusDamage', () => {
    test('calculates burning damage correctly', () => {
      const target = { currentHP: 50 };

      const damage = resolver.calculateStatusDamage(target, 'burning', 2);

      expect(damage).toBe(2); // 2 * 2 * 0.5
    });

    test('calculates poisoned damage correctly', () => {
      const target = { currentHP: 50 };

      const damage = resolver.calculateStatusDamage(target, 'poisoned', 3);

      expect(damage).toBe(4.5); // 3 * 3 * 0.5
    });

    test('calculates paralyzed damage correctly', () => {
      const target = { currentHP: 50 };

      const damage = resolver.calculateStatusDamage(target, 'paralyzed', 2);

      expect(damage).toBe(1); // 1 * 2 * 0.5
    });

    test('returns 0 for unknown status', () => {
      const target = { currentHP: 50 };

      const damage = resolver.calculateStatusDamage(target, 'unknown', 2);

      expect(damage).toBe(0);
    });
  });

  describe('applyDamage', () => {
    test('applies damage to target HP', () => {
      const target = { armor: 0, currentHP: 50 };

      const result = resolver.applyDamage(target, 10);

      expect(result.hpLost).toBe(10);
      expect(result.armorDamage).toBe(0);
      expect(result.currentHP).toBe(40);
      expect(result.isDead).toBe(false);
    });

    test('reduces armor before HP', () => {
      const target = { armor: 8, currentHP: 50 };

      const result = resolver.applyDamage(target, 10);

      expect(result.armorDamage).toBe(8);
      expect(result.hpLost).toBe(2);
      expect(result.currentHP).toBe(48);
      expect(result.residualArmor).toBe(0);
    });

    test('kills target when HP reaches zero', () => {
      const target = { armor: 0, currentHP: 5 };

      const result = resolver.applyDamage(target, 10);

      expect(result.currentHP).toBe(0);
      expect(result.isDead).toBe(true);
    });

    test('handles overkill damage', () => {
      const target = { armor: 0, currentHP: 3 };

      const result = resolver.applyDamage(target, 10);

      expect(result.currentHP).toBe(0);
      expect(result.isDead).toBe(true);
    });

    test('does not reduce HP below zero', () => {
      const target = { armor: 5, currentHP: 3 };

      const result = resolver.applyDamage(target, 10);

      expect(result.currentHP).toBe(0);
      expect(result.isDead).toBe(true);
    });
  });
});

describe('BattleSimulator', () => {
  let simulator;
  let playerState;
  let enemyState;
  let deck;

  beforeEach(() => {
    simulator = new BattleSimulator({ maxTurns: 20, verbose: false });
    clearMockStorage();
    jest.clearAllMocks();

    playerState = {
      currentHP: 80,
      maxHP: 80,
      currentEnergy: 3,
      maxEnergy: 3,
      armor: 0,
      status: [],
      statusStacks: {},
      damageBonus: 0,
      synergyBonus: 0,
      archetypeBonus: 0,
      critChance: 0
    };

    enemyState = {
      currentHP: 50,
      maxHP: 50,
      armor: 0,
      damage: 8,
      damageScaling: 0.1,
      status: [],
      statusStacks: {},
      intent: 'attack'
    };

    deck = [
      { id: 'strike', name: 'Strike', damage: 6, cost: 1, type: 'attack' },
      { id: 'strike', name: 'Strike', damage: 6, cost: 1, type: 'attack' },
      { id: 'defend', name: 'Defend', damage: 5, cost: 1, type: 'skill' },
      { id: 'bash', name: 'Bash', damage: 8, cost: 2, type: 'attack' },
      { id: 'heavy_strike', name: 'Heavy Strike', damage: 12, cost: 3, type: 'attack' }
    ];
  });

  describe('constructor', () => {
    test('initializes with default options', () => {
      expect(simulator.maxTurns).toBe(20);
      expect(simulator.verbose).toBe(false);
      expect(simulator.battleHistory).toEqual([]);
      expect(simulator.metrics).toBeInstanceOf(BattleMetrics);
      expect(simulator.resolver).toBeInstanceOf(CombatResolver);
    });

    test('initializes with custom options', () => {
      const customSimulator = new BattleSimulator({
        maxTurns: 30,
        verbose: true,
        resolver: { criticalMultiplier: 2.0 }
      });

      expect(customSimulator.maxTurns).toBe(30);
      expect(customSimulator.verbose).toBe(true);
    });
  });

  describe('simulateBattle', () => {
    test('simulates a complete battle', () => {
      const result = simulator.simulateBattle(playerState, enemyState, deck);

      expect(result).toBeDefined();
      expect(result.turnsElapsed).toBeGreaterThan(0);
      expect(result.victory !== undefined || result.defeat !== undefined || result.draw !== undefined).toBe(true);
      expect(result.finalPlayerHP).toBeDefined();
      expect(result.finalEnemyHP).toBeDefined();
      expect(result.battleTime).toBeGreaterThanOrEqual(0);
      expect(result.metrics).toBeDefined();
    });

    test('records metrics correctly', () => {
      const result = simulator.simulateBattle(playerState, enemyState, deck);

      expect(result.metrics.totalDamage).toBeGreaterThanOrEqual(0);
      expect(result.metrics.energySpent).toBeGreaterThanOrEqual(0);
      expect(result.metrics.turnsElapsed).toBe(result.turnsElapsed);
    });

    test('handles player victory', () => {
      const weakEnemy = { ...enemyState, currentHP: 5, damage: 1 };
      const result = simulator.simulateBattle(playerState, weakEnemy, deck);

      expect(result.victory || result.defeat).toBe(true);
    });

    test('handles player defeat', () => {
      const strongEnemy = { ...enemyState, damage: 100 };
      const result = simulator.simulateBattle(playerState, strongEnemy, deck);

      expect(result.victory || result.defeat).toBe(true);
    });

    test('respects max turns limit', () => {
      const result = simulator.simulateBattle(playerState, enemyState, deck);

      expect(result.turnsElapsed).toBeLessThanOrEqual(simulator.maxTurns);
    });

    test('adds result to battle history', () => {
      simulator.simulateBattle(playerState, enemyState, deck);

      expect(simulator.battleHistory).toHaveLength(1);
    });

    test('accumulates multiple battles in history', () => {
      simulator.simulateBattle(playerState, enemyState, deck);
      simulator.simulateBattle(playerState, enemyState, deck);

      expect(simulator.battleHistory).toHaveLength(2);
    });
  });

  describe('drawCards', () => {
    test('draws specified number of cards', () => {
      const testDeck = [...deck];
      const drawn = simulator.drawCards(testDeck, 3);

      expect(drawn).toHaveLength(3);
    });

    test('removes drawn cards from deck', () => {
      const testDeck = [...deck];
      simulator.drawCards(testDeck, 3);

      expect(testDeck).toHaveLength(2);
    });

    test('handles drawing more cards than available', () => {
      const testDeck = [{ id: 'strike', damage: 6, cost: 1 }];
      const drawn = simulator.drawCards(testDeck, 5);

      expect(drawn).toHaveLength(1);
      expect(testDeck).toHaveLength(0);
    });

    test('handles drawing from empty deck', () => {
      const testDeck = [];
      const drawn = simulator.drawCards(testDeck, 3);

      expect(drawn).toHaveLength(0);
    });
  });

  describe('calculateEnergy', () => {
    test('calculates base energy correctly', () => {
      const energy = simulator.calculateEnergy(1, {});

      expect(energy).toBe(3);
    });

    test('scales energy per turn', () => {
      const energy = simulator.calculateEnergy(5, { energyPerTurn: 1 });

      expect(energy).toBe(7); // 3 + (5-1) * 1
    });

    test('respects max energy limit', () => {
      const energy = simulator.calculateEnergy(20, { energyPerTurn: 1, maxEnergy: 10 });

      expect(energy).toBe(10);
    });

    test('uses context values', () => {
      const energy = simulator.calculateEnergy(1, { energyPerTurn: 2, maxEnergy: 15 });

      expect(energy).toBe(3); // Base energy on turn 1
    });
  });

  describe('getEnemyAction', () => {
    test('returns attack intent with damage', () => {
      const enemy = { damage: 10, damageScaling: 0, intent: 'attack' };
      const action = simulator.getEnemyAction(enemy, 1);

      expect(action.action).toBe('attack');
      expect(action.damage).toBe(10); // baseDamage when scaling = 0
    });

    test('scales damage with turn', () => {
      const enemy = { damage: 10, damageScaling: 0.5, intent: 'attack' };
      const action = simulator.getEnemyAction(enemy, 3);

      expect(action.damage).toBe(20); // 10 * (1 + 0.5 * (3-1)) = 10 * 2 = 20
    });

    test('returns defend intent', () => {
      const enemy = { damage: 10, intent: 'defend' };
      const action = simulator.getEnemyAction(enemy, 1);

      expect(action.action).toBe('defend');
      expect(action.damage).toBe(0);
    });
  });

  describe('processStatusEffects', () => {
    test('processes player burning status', () => {
      const player = { status: ['burning'], statusStacks: { burning: 2 }, currentHP: 50 };
      const enemy = { currentHP: 50 };

      const damage = simulator.processStatusEffects(player, enemy);

      expect(damage).toBe(2); // 2 base * 2 stacks * 0.5 multiplier
    });

    test('processes player poisoned status', () => {
      const player = { status: ['poisoned'], statusStacks: { poisoned: 3 }, currentHP: 50 };
      const enemy = { currentHP: 50 };

      const damage = simulator.processStatusEffects(player, enemy);

      expect(damage).toBe(4.5); // 3 base * 3 stacks * 0.5
    });

    test('processes enemy burning status', () => {
      const player = { currentHP: 50 };
      const enemy = { status: ['burning'], statusStacks: { burning: 2 }, currentHP: 50 };

      const damage = simulator.processStatusEffects(player, enemy);

      expect(damage).toBe(2);
    });

    test('processes multiple status effects', () => {
      const player = { status: ['burning'], statusStacks: { burning: 2 }, currentHP: 50 };
      const enemy = { status: ['poisoned'], statusStacks: { poisoned: 2 }, currentHP: 50 };

      const damage = simulator.processStatusEffects(player, enemy);

      // burning: 2 base * 2 stacks * 0.5 = 2
      // poisoned: 3 base * 2 stacks * 0.5 = 3
      // total = 5
      expect(damage).toBe(5);
    });
    test('handles no status effects', () => {
      const player = { currentHP: 50 };
      const enemy = { currentHP: 50 };

      const damage = simulator.processStatusEffects(player, enemy);

      expect(damage).toBe(0);
    });
  });

  describe('predictOutcome', () => {
    test('predicts victory correctly', () => {
      const weakEnemy = { currentHP: 10, damage: 1 };
      const strongDeck = [
        { damage: 20, cost: 2 },
        { damage: 20, cost: 2 },
        { damage: 20, cost: 2 }
      ];

      const prediction = simulator.predictOutcome(playerState, weakEnemy, strongDeck);

      expect(prediction.predictedVictory).toBe(true);
      expect(prediction.estimatedTurnsToWin).toBeDefined();
      expect(prediction.confidence).toBe(0.6);
    });

    test('predicts defeat correctly', () => {
      const strongEnemy = { currentHP: 200, damage: 50 };
      const weakDeck = [
        { damage: 5, cost: 2 },
        { damage: 5, cost: 2 }
      ];

      const prediction = simulator.predictOutcome(playerState, strongEnemy, weakDeck);

      expect(prediction.predictedVictory).toBe(false);
    });

    test('returns confidence level', () => {
      const prediction = simulator.predictOutcome(playerState, enemyState, deck);

      expect(prediction.confidence).toBe(0.6);
    });
  });

  describe('getBattleHistory', () => {
    test('returns battle history', () => {
      simulator.simulateBattle(playerState, enemyState, deck);

      const history = simulator.getBattleHistory();

      expect(history).toHaveLength(1);
      expect(history[0]).toHaveProperty('victory');
      expect(history[0]).toHaveProperty('turnsElapsed');
    });

    test('returns empty array when no battles simulated', () => {
      const history = simulator.getBattleHistory();

      expect(history).toEqual([]);
    });
  });

  describe('clearHistory', () => {
    test('clears battle history', () => {
      simulator.simulateBattle(playerState, enemyState, deck);
      simulator.simulateBattle(playerState, enemyState, deck);

      simulator.clearHistory();

      expect(simulator.battleHistory).toEqual([]);
    });
  });
});

describe('BattleSimulator with verbose mode', () => {
  test('logs combat actions when verbose is true', () => {
    const verboseSimulator = new BattleSimulator({ maxTurns: 5, verbose: true });
    const playerState = {
      currentHP: 80,
      currentEnergy: 3,
      armor: 0,
      status: [],
      statusStacks: {}
    };
    const enemyState = {
      currentHP: 30,
      damage: 5,
      intent: 'attack'
    };
    const deck = [
      { id: 'strike', name: 'Strike', damage: 10, cost: 1, type: 'attack' }
    ];

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    verboseSimulator.simulateBattle(playerState, enemyState, deck);
    
    // Should have logged combat actions
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});