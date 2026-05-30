/**
 * V101 Deck Archetype Evolution System Tests (Direction C - Iteration 8/9)
 * 测试 ArchetypeRegistry | CardEvolution | ArchetypeEngine
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
    'defend': { id: 'defend', name: 'Defend', block: 5, cost: 1, type: 'skill' },
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

const { ArchetypeRegistry, CardEvolution, ArchetypeEngine } = require('../../deck-archetype-evolution.js');

describe('ArchetypeRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new ArchetypeRegistry();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('initializes with empty archetypes map', () => {
      expect(registry.archetypes.size).toBe(0);
      expect(registry.cardArchetypes.size).toBe(0);
    });

    test('initializes with empty evolution paths map', () => {
      expect(registry.evolutionPaths.size).toBe(0);
    });

    test('initializes with empty unlocked archetypes set', () => {
      expect(registry.unlockedArchetypes.size).toBe(0);
    });
  });

  describe('registerArchetype', () => {
    test('registers a valid archetype definition', () => {
      const archetypeDef = {
        id: 'aggro',
        name: 'Aggressive',
        coreCards: ['strike', 'bash'],
        threshold: 5,
        bonuses: { damage: 0.1 }
      };
      
      expect(registry.registerArchetype(archetypeDef)).toBe(true);
      expect(registry.getArchetypeCount()).toBe(1);
    });

    test('returns false for invalid archetype without id', () => {
      const archetypeDef = {
        name: 'Aggressive',
        coreCards: ['strike']
      };
      
      expect(registry.registerArchetype(archetypeDef)).toBe(false);
    });

    test('returns false for invalid archetype without name', () => {
      const archetypeDef = {
        id: 'aggro',
        coreCards: ['strike']
      };
      
      expect(registry.registerArchetype(archetypeDef)).toBe(false);
    });

    test('returns false for null archetype', () => {
      expect(registry.registerArchetype(null)).toBe(false);
    });

    test('returns false for undefined archetype', () => {
      expect(registry.registerArchetype(undefined)).toBe(false);
    });

    test('registers archetype with default values', () => {
      const archetypeDef = {
        id: 'test_archetype',
        name: 'Test'
      };
      
      expect(registry.registerArchetype(archetypeDef)).toBe(true);
      const archetype = registry.getArchetype('test_archetype');
      expect(archetype).not.toBeNull();
      expect(archetype.coreCards).toEqual([]);
      expect(archetype.threshold).toBe(10);
      expect(archetype.bonuses).toEqual({});
      expect(archetype.evolutionLevel).toBe(0);
      expect(archetype.maxEvolutionLevel).toBe(5);
    });

    test('builds card-to-archetype index', () => {
      const archetypeDef = {
        id: 'aggro',
        name: 'Aggressive',
        coreCards: ['strike', 'bash', 'heavy_strike']
      };
      
      registry.registerArchetype(archetypeDef);
      
      expect(registry.cardArchetypes.get('strike')).toContain('aggro');
      expect(registry.cardArchetypes.get('bash')).toContain('aggro');
      expect(registry.cardArchetypes.get('heavy_strike')).toContain('aggro');
    });

    test('registers archetype with custom max evolution level', () => {
      const archetypeDef = {
        id: 'test',
        name: 'Test',
        maxEvolutionLevel: 10
      };
      
      registry.registerArchetype(archetypeDef);
      const archetype = registry.getArchetype('test');
      expect(archetype.maxEvolutionLevel).toBe(10);
    });
  });

  describe('getArchetype', () => {
    test('returns archetype by id', () => {
      const archetypeDef = {
        id: 'aggro',
        name: 'Aggressive',
        coreCards: ['strike']
      };
      registry.registerArchetype(archetypeDef);
      
      const archetype = registry.getArchetype('aggro');
      expect(archetype).not.toBeNull();
      expect(archetype.id).toBe('aggro');
      expect(archetype.name).toBe('Aggressive');
    });

    test('returns null for non-existent archetype', () => {
      const archetype = registry.getArchetype('non_existent');
      expect(archetype).toBeNull();
    });
  });

  describe('getArchetypesForCard', () => {
    test('returns archetypes associated with card', () => {
      const def1 = { id: 'aggro', name: 'Aggressive', coreCards: ['strike'] };
      const def2 = { id: 'rush', name: 'Rush', coreCards: ['strike', 'bash'] };
      registry.registerArchetype(def1);
      registry.registerArchetype(def2);
      
      const archetypes = registry.getArchetypesForCard('strike');
      expect(archetypes.length).toBe(2);
    });

    test('returns empty array for card with no archetypes', () => {
      const archetypes = registry.getArchetypesForCard('fireball');
      expect(archetypes.length).toBe(0);
    });
  });

  describe('getAllArchetypes', () => {
    test('returns all registered archetypes', () => {
      registry.registerArchetype({ id: 'aggro', name: 'Aggro', coreCards: ['strike'] });
      registry.registerArchetype({ id: 'control', name: 'Control', coreCards: ['defend'] });
      registry.registerArchetype({ id: 'combo', name: 'Combo', coreCards: ['fireball'] });
      
      const all = registry.getAllArchetypes();
      expect(all.length).toBe(3);
    });

    test('returns empty array when no archetypes registered', () => {
      const all = registry.getAllArchetypes();
      expect(all.length).toBe(0);
    });
  });

  describe('checkArchetypeCondition', () => {
    beforeEach(() => {
      registry.registerArchetype({
        id: 'aggro',
        name: 'Aggressive',
        coreCards: ['strike', 'bash']
      });
    });

    test('returns true when all core cards present', () => {
      const deckCardIds = ['strike', 'bash', 'defend'];
      expect(registry.checkArchetypeCondition('aggro', deckCardIds)).toBe(true);
    });

    test('returns false when missing core cards', () => {
      const deckCardIds = ['strike', 'defend'];
      expect(registry.checkArchetypeCondition('aggro', deckCardIds)).toBe(false);
    });

    test('returns false for non-existent archetype', () => {
      const deckCardIds = ['strike', 'bash'];
      expect(registry.checkArchetypeCondition('non_existent', deckCardIds)).toBe(false);
    });

    test('returns true when archetype has no core cards', () => {
      registry.registerArchetype({
        id: 'universal',
        name: 'Universal',
        coreCards: []
      });
      const deckCardIds = ['strike', 'defend'];
      expect(registry.checkArchetypeCondition('universal', deckCardIds)).toBe(true);
    });
  });

  describe('unlockArchetype', () => {
    beforeEach(() => {
      registry.registerArchetype({
        id: 'aggro',
        name: 'Aggressive',
        coreCards: ['strike']
      });
    });

    test('unlocks locked archetype', () => {
      expect(registry.unlockArchetype('aggro')).toBe(true);
      expect(registry.getArchetype('aggro').unlocked).toBe(true);
      expect(registry.getUnlockedCount()).toBe(1);
    });

    test('returns false for already unlocked archetype', () => {
      registry.unlockArchetype('aggro');
      expect(registry.unlockArchetype('aggro')).toBe(false);
    });

    test('returns false for non-existent archetype', () => {
      expect(registry.unlockArchetype('non_existent')).toBe(false);
    });
  });

  describe('lockArchetype', () => {
    beforeEach(() => {
      registry.registerArchetype({
        id: 'aggro',
        name: 'Aggressive',
        coreCards: ['strike']
      });
      registry.unlockArchetype('aggro');
    });

    test('locks unlocked archetype', () => {
      expect(registry.lockArchetype('aggro')).toBe(true);
      expect(registry.getArchetype('aggro').unlocked).toBe(false);
      expect(registry.getUnlockedCount()).toBe(0);
    });

    test('returns false for already locked archetype', () => {
      registry.lockArchetype('aggro');
      expect(registry.lockArchetype('aggro')).toBe(false);
    });
  });

  describe('setEvolutionLevel', () => {
    beforeEach(() => {
      registry.registerArchetype({
        id: 'aggro',
        name: 'Aggressive',
        coreCards: ['strike'],
        maxEvolutionLevel: 5
      });
    });

    test('sets valid evolution level', () => {
      expect(registry.setEvolutionLevel('aggro', 3)).toBe(true);
      expect(registry.getEvolutionLevel('aggro')).toBe(3);
    });

    test('clamps level to max', () => {
      expect(registry.setEvolutionLevel('aggro', 10)).toBe(true);
      expect(registry.getEvolutionLevel('aggro')).toBe(5);
    });

    test('clamps level to minimum 0', () => {
      expect(registry.setEvolutionLevel('aggro', -5)).toBe(true);
      expect(registry.getEvolutionLevel('aggro')).toBe(0);
    });

    test('returns false for non-existent archetype', () => {
      expect(registry.setEvolutionLevel('non_existent', 3)).toBe(false);
    });
  });

  describe('incrementEvolutionLevel', () => {
    beforeEach(() => {
      registry.registerArchetype({
        id: 'aggro',
        name: 'Aggressive',
        coreCards: ['strike'],
        maxEvolutionLevel: 5
      });
    });

    test('increments level by 1', () => {
      registry.setEvolutionLevel('aggro', 2);
      expect(registry.incrementEvolutionLevel('aggro')).toBe(true);
      expect(registry.getEvolutionLevel('aggro')).toBe(3);
    });

    test('increments level by custom amount', () => {
      registry.setEvolutionLevel('aggro', 1);
      expect(registry.incrementEvolutionLevel('aggro', 2)).toBe(true);
      expect(registry.getEvolutionLevel('aggro')).toBe(3);
    });

    test('respects max level cap', () => {
      registry.setEvolutionLevel('aggro', 4);
      expect(registry.incrementEvolutionLevel('aggro')).toBe(true);
      expect(registry.getEvolutionLevel('aggro')).toBe(5);
    });

    test('returns false for non-existent archetype', () => {
      expect(registry.incrementEvolutionLevel('non_existent')).toBe(false);
    });
  });

  describe('getEvolutionLevel', () => {
    test('returns -1 for non-existent archetype', () => {
      expect(registry.getEvolutionLevel('non_existent')).toBe(-1);
    });

    test('returns 0 for newly registered archetype', () => {
      registry.registerArchetype({ id: 'test', name: 'Test' });
      expect(registry.getEvolutionLevel('test')).toBe(0);
    });
  });

  describe('registerEvolutionPath', () => {
    test('registers valid evolution path', () => {
      const milestones = [
        { level: 1, bonus: 'damage_boost' },
        { level: 2, bonus: 'cost_reduction' },
        { level: 3, bonus: 'synergy_multiplier' }
      ];
      expect(registry.registerEvolutionPath('aggro', milestones)).toBe(true);
    });

    test('returns false for invalid input', () => {
      expect(registry.registerEvolutionPath(null, [])).toBe(false);
      expect(registry.registerEvolutionPath('aggro', null)).toBe(false);
    });
  });

  describe('getEvolutionPath', () => {
    test('returns evolution path', () => {
      const milestones = [
        { level: 1, bonus: 'damage_boost' },
        { level: 2, bonus: 'cost_reduction' }
      ];
      registry.registerEvolutionPath('aggro', milestones);
      expect(registry.getEvolutionPath('aggro')).toEqual(milestones);
    });

    test('returns empty array for non-existent archetype', () => {
      expect(registry.getEvolutionPath('non_existent')).toEqual([]);
    });
  });

  describe('clear', () => {
    test('clears all data', () => {
      registry.registerArchetype({ id: 'aggro', name: 'Aggro', coreCards: ['strike'] });
      registry.registerArchetype({ id: 'control', name: 'Control', coreCards: ['defend'] });
      registry.unlockArchetype('aggro');
      
      registry.clear();
      
      expect(registry.archetypes.size).toBe(0);
      expect(registry.cardArchetypes.size).toBe(0);
      expect(registry.evolutionPaths.size).toBe(0);
      expect(registry.unlockedArchetypes.size).toBe(0);
    });
  });

  describe('getUnlockedCount', () => {
    test('returns count of unlocked archetypes', () => {
      registry.registerArchetype({ id: 'aggro', name: 'Aggro', coreCards: ['strike'] });
      registry.registerArchetype({ id: 'control', name: 'Control', coreCards: ['defend'] });
      registry.registerArchetype({ id: 'combo', name: 'Combo', coreCards: ['fireball'] });
      registry.unlockArchetype('aggro');
      registry.unlockArchetype('control');
      
      expect(registry.getUnlockedCount()).toBe(2);
    });

    test('returns 0 when none unlocked', () => {
      expect(registry.getUnlockedCount()).toBe(0);
    });
  });
});

describe('CardEvolution', () => {
  let registry;
  let evolution;

  beforeEach(() => {
    registry = new ArchetypeRegistry();
    evolution = new CardEvolution(registry);
    jest.clearAllMocks();
    
    registry.registerArchetype({
      id: 'aggro',
      name: 'Aggressive',
      coreCards: ['strike', 'bash'],
      threshold: 5,
      bonuses: { damage: 0.1 },
      maxEvolutionLevel: 5
    });
  });

  describe('constructor', () => {
    test('initializes with empty cache', () => {
      expect(evolution.evolutionCache.size).toBe(0);
    });

    test('initializes with empty history', () => {
      expect(evolution.evolutionHistory.length).toBe(0);
    });

    test('stores registry reference', () => {
      expect(evolution.registry).toBe(registry);
    });
  });

  describe('checkEvolutionCondition', () => {
    test('returns canEvolve=false for non-existent archetype', () => {
      const result = evolution.checkEvolutionCondition('strike', 'non_existent', {});
      expect(result.canEvolve).toBe(false);
      expect(result.reason).toBe('archetype_not_found');
    });

    test('returns canEvolve=false for locked archetype', () => {
      const gameState = {
        playedCards: ['strike', 'bash'],
        triggeredSynergies: []
      };
      const result = evolution.checkEvolutionCondition('strike', 'aggro', gameState);
      expect(result.canEvolve).toBe(false);
      expect(result.reason).toBe('archetype_locked');
    });

    test('returns canEvolve=false when core card not played', () => {
      registry.unlockArchetype('aggro');
      const gameState = {
        playedCards: ['defend'],
        triggeredSynergies: []
      };
      const result = evolution.checkEvolutionCondition('strike', 'aggro', gameState);
      expect(result.canEvolve).toBe(false);
      expect(result.reason).toBe('core_card_not_played');
    });

    test('returns canEvolve=true when all conditions met', () => {
      registry.unlockArchetype('aggro');
      const gameState = {
        playedCards: ['strike', 'bash'],
        triggeredSynergies: ['synergy_1']
      };
      const result = evolution.checkEvolutionCondition('strike', 'aggro', gameState);
      expect(result.canEvolve).toBe(true);
      expect(result.reason).toBe('all_conditions_met');
    });
  });

  describe('calculateEvolvedStats', () => {
    test('returns original card for invalid input', () => {
      const originalCard = { id: 'strike', damage: 6 };
      expect(evolution.calculateEvolvedStats(null, originalCard, 'aggro')).toBe(originalCard);
      expect(evolution.calculateEvolvedStats('strike', originalCard, null)).toBe(originalCard);
      expect(evolution.calculateEvolvedStats('strike', null, 'aggro')).toBe(null);
    });

    test('applies damage bonus based on evolution level', () => {
      registry.setEvolutionLevel('aggro', 2);
      const originalCard = { id: 'strike', damage: 6, cost: 1 };
      const evolved = evolution.calculateEvolvedStats('strike', originalCard, 'aggro');
      
      // 2 levels = 20% bonus * 0.1 (bonuses.damage) = +0.2 damage ~ round to nearest int
      expect(evolved.damage).toBeGreaterThan(originalCard.damage);
      expect(evolved._evolution.archetypeId).toBe('aggro');
      expect(evolved._evolution.evolutionLevel).toBe(2);
    });

    test('applies cost reduction bonus', () => {
      registry.registerArchetype({
        id: 'control',
        name: 'Control',
        coreCards: ['defend'],
        bonuses: { costReduction: 0.2 }
      });
      registry.setEvolutionLevel('control', 3);
      const originalCard = { id: 'defend', damage: 5, cost: 5 };
      const evolved = evolution.calculateEvolvedStats('defend', originalCard, 'control');

      expect(evolved.cost).toBeLessThan(originalCard.cost);
    });

    test('applies synergy bonus when provided', () => {
      registry.setEvolutionLevel('aggro', 1);
      const originalCard = { id: 'strike', damage: 6, cost: 1 };
      const evolved = evolution.calculateEvolvedStats('strike', originalCard, 'aggro', {
        synergyBonus: 10
      });
      
      expect(evolved._evolution.synergyBonusApplied).toBe(10);
    });

    test('applies season bonus when provided', () => {
      registry.setEvolutionLevel('aggro', 1);
      const originalCard = { id: 'strike', damage: 6, cost: 1 };
      const evolved = evolution.calculateEvolvedStats('strike', originalCard, 'aggro', {
        seasonBonus: 5
      });
      
      expect(evolved._evolution.seasonBonusApplied).toBe(5);
    });

    test('applies ELO bonus when rating is high', () => {
      registry.setEvolutionLevel('aggro', 1);
      const originalCard = { id: 'strike', damage: 6, cost: 1 };
      const evolved = evolution.calculateEvolvedStats('strike', originalCard, 'aggro', {
        eloRating: 1700
      });
      
      expect(evolved._evolution.eloBonusApplied).toBeGreaterThan(0);
    });

    test('does not apply ELO bonus for low rating', () => {
      registry.setEvolutionLevel('aggro', 1);
      const originalCard = { id: 'strike', damage: 6, cost: 1 };
      const evolved = evolution.calculateEvolvedStats('strike', originalCard, 'aggro', {
        eloRating: 1400
      });
      
      expect(evolved._evolution.eloBonusApplied).toBeUndefined();
    });
  });

  describe('getEvolvedCard', () => {
    test('caches evolved card result', () => {
      registry.setEvolutionLevel('aggro', 1);
      const originalCard = { id: 'strike', damage: 6, cost: 1 };
      
      const evolved1 = evolution.getEvolvedCard('strike', originalCard, 'aggro', {});
      const evolved2 = evolution.getEvolvedCard('strike', originalCard, 'aggro', {});
      
      expect(evolution.evolutionCache.size).toBe(1);
      expect(evolved1).toEqual(evolved2);
    });
  });

  describe('performEvolution', () => {
    test('returns success=false when evolution not possible', () => {
      const gameState = {
        playedCards: ['defend'],
        triggeredSynergies: []
      };
      const originalCard = { id: 'strike', damage: 6 };
      
      const result = evolution.performEvolution('strike', 'aggro', gameState, { originalCard });
      expect(result.success).toBe(false);
    });

    test('returns success=false when card not found', () => {
      registry.unlockArchetype('aggro');
      const gameState = {
        playedCards: ['strike', 'bash'],
        triggeredSynergies: [],
        cards: {}
      };
      
      const result = evolution.performEvolution('strike', 'aggro', gameState, {});
      expect(result.success).toBe(false);
      expect(result.message).toBe('card_not_found');
    });

    test('returns success=true when all conditions met', () => {
      registry.unlockArchetype('aggro');
      const gameState = {
        playedCards: ['strike', 'bash'],
        triggeredSynergies: [],
        cards: { strike: { id: 'strike', damage: 6 } }
      };
      
      const result = evolution.performEvolution('strike', 'aggro', gameState, {});
      expect(result.success).toBe(true);
      expect(result.evolvedCard).not.toBeNull();
      expect(result.message).toBe('evolution_success');
    });

    test('records evolution in history', () => {
      registry.unlockArchetype('aggro');
      const gameState = {
        playedCards: ['strike', 'bash'],
        triggeredSynergies: [],
        cards: { strike: { id: 'strike', damage: 6 } },
        playerId: 'player_1'
      };
      
      evolution.performEvolution('strike', 'aggro', gameState, {});
      expect(evolution.evolutionHistory.length).toBe(1);
      expect(evolution.evolutionHistory[0].cardId).toBe('strike');
      expect(evolution.evolutionHistory[0].archetypeId).toBe('aggro');
    });
  });

  describe('getEvolutionHistory', () => {
    test('returns evolution history', () => {
      registry.unlockArchetype('aggro');
      const gameState = {
        playedCards: ['strike', 'bash'],
        triggeredSynergies: [],
        cards: { strike: { id: 'strike', damage: 6 } }
      };
      
      evolution.performEvolution('strike', 'aggro', gameState, {});
      const history = evolution.getEvolutionHistory();
      
      expect(history.length).toBe(1);
    });

    test('respects limit parameter', () => {
      const history = evolution.getEvolutionHistory(5);
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('clearCache', () => {
    test('clears evolution cache', () => {
      registry.setEvolutionLevel('aggro', 1);
      const originalCard = { id: 'strike', damage: 6 };
      evolution.getEvolvedCard('strike', originalCard, 'aggro', {});
      
      expect(evolution.evolutionCache.size).toBe(1);
      evolution.clearCache();
      expect(evolution.evolutionCache.size).toBe(0);
    });
  });

  describe('resetHistory', () => {
    test('resets evolution history', () => {
      registry.unlockArchetype('aggro');
      const gameState = {
        playedCards: ['strike', 'bash'],
        triggeredSynergies: [],
        cards: { strike: { id: 'strike', damage: 6 } }
      };
      
      evolution.performEvolution('strike', 'aggro', gameState, {});
      expect(evolution.evolutionHistory.length).toBe(1);
      
      evolution.resetHistory();
      expect(evolution.evolutionHistory.length).toBe(0);
    });
  });
});

describe('ArchetypeEngine', () => {
  let engine;
  let mockSynergyRegistry;
  let mockMetagameTracker;
  let mockEloRating;
  let mockEnergyTuner;

  beforeEach(() => {
    engine = new ArchetypeEngine();
    
    mockSynergyRegistry = {
      getSynergyChains: jest.fn(() => [{ synergyId: 'syn_1' }])
    };
    
    mockMetagameTracker = {
      getEvolutionStatus: jest.fn(() => ({ buffedCards: ['card1', 'card2'] }))
    };
    
    mockEloRating = {
      getRating: jest.fn(() => 1600)
    };
    
    mockEnergyTuner = {
      analyzeDeckEnergy: jest.fn(() => ({ curveShape: 'balanced' }))
    };
    
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('initializes with default values', () => {
      expect(engine.maxEvolutionLevel).toBe(5);
      expect(engine.energyCostPerEvolution).toBe(3);
    });

    test('initializes with empty active evolutions', () => {
      expect(engine.activeEvolutions.size).toBe(0);
    });

    test('initializes with empty evolution queue', () => {
      expect(engine.evolutionQueue.length).toBe(0);
    });

    test('creates default registry', () => {
      expect(engine.registry).toBeInstanceOf(ArchetypeRegistry);
    });

    test('creates default cardEvolution', () => {
      expect(engine.cardEvolution).toBeInstanceOf(CardEvolution);
    });
  });

  describe('initialize', () => {
    test('injects synergy registry dependency', () => {
      engine.initialize({ synergyRegistry: mockSynergyRegistry });
      expect(engine.synergyRegistry).toBe(mockSynergyRegistry);
    });

    test('injects metagame tracker dependency', () => {
      engine.initialize({ metagameTracker: mockMetagameTracker });
      expect(engine.metagameTracker).toBe(mockMetagameTracker);
    });

    test('injects ELO rating dependency', () => {
      engine.initialize({ eloRating: mockEloRating });
      expect(engine.eloRating).toBe(mockEloRating);
    });

    test('injects energy tuner dependency', () => {
      engine.initialize({ energyTuner: mockEnergyTuner });
      expect(engine.energyTuner).toBe(mockEnergyTuner);
    });
  });

  describe('checkEvolutionTrigger', () => {
    beforeEach(() => {
      engine.registry.registerArchetype({
        id: 'aggro',
        name: 'Aggressive',
        coreCards: ['strike', 'bash'],
        threshold: 5,
        bonuses: { damage: 0.1 }
      });
      engine.initialize({ synergyRegistry: mockSynergyRegistry });
    });

    test('returns triggered=false for non-existent archetype', () => {
      const gameState = { deckCards: ['strike'] };
      const result = engine.checkEvolutionTrigger('non_existent', gameState);
      expect(result.triggered).toBe(false);
      expect(result.reason).toBe('archetype_not_found');
    });

    test('returns triggered=false when missing required cards', () => {
      const gameState = { deckCards: ['defend'] };
      const result = engine.checkEvolutionTrigger('aggro', gameState);
      expect(result.triggered).toBe(false);
      expect(result.reason).toBe('missing_required_cards');
    });

    test('returns triggered=false when synergy not triggered', () => {
      // Register archetype WITH triggerSynergy requirement
      engine.registry.registerArchetype({
        id: 'synergy_required',
        name: 'Synergy Required',
        coreCards: ['strike', 'bash'],
        triggerSynergy: 'required_synergy',
        bonuses: { damage: 0.1 }
      });
      mockSynergyRegistry.getSynergyChains = jest.fn(() => []);
      const gameState = {
        deckCards: ['strike', 'bash'],
        player: { energy: 10 }
      };
      const result = engine.checkEvolutionTrigger('synergy_required', gameState);
      expect(result.triggered).toBe(false);
      expect(result.reason).toBe('synergy_not_triggered');
    });

    test('returns triggered=false when insufficient energy', () => {
      const gameState = {
        deckCards: ['strike', 'bash'],
        player: { energy: 1 }
      };
      const result = engine.checkEvolutionTrigger('aggro', gameState);
      expect(result.triggered).toBe(false);
      expect(result.reason).toBe('insufficient_energy');
    });

    test('returns triggered=true when all conditions met', () => {
      const gameState = {
        deckCards: ['strike', 'bash'],
        player: { energy: 10 }
      };
      const result = engine.checkEvolutionTrigger('aggro', gameState);
      expect(result.triggered).toBe(true);
    });
  });

  describe('calculateEvolutionEnergyCost', () => {
    beforeEach(() => {
      engine.registry.registerArchetype({
        id: 'aggro',
        name: 'Aggressive',
        coreCards: ['strike'],
        bonuses: {}
      });
      engine.initialize({ energyTuner: mockEnergyTuner });
    });

    test('returns base energy cost', () => {
      const gameState = { deckCards: ['strike'] };
      const cost = engine.calculateEvolutionEnergyCost('aggro', gameState);
      expect(cost).toBe(3); // base cost
    });

    test('increases cost for late-game heavy curves', () => {
      mockEnergyTuner.analyzeDeckEnergy = jest.fn(() => ({ curveShape: 'late_game_heavy' }));
      const gameState = { 
        deckId: 'deck1',
        deckCards: ['strike'] 
      };
      const cost = engine.calculateEvolutionEnergyCost('aggro', gameState);
      expect(cost).toBeGreaterThan(3);
    });

    test('increases cost with evolution level', () => {
      engine.registry.setEvolutionLevel('aggro', 3);
      const gameState = { deckCards: ['strike'] };
      const cost = engine.calculateEvolutionEnergyCost('aggro', gameState);
      expect(cost).toBeGreaterThan(3);
    });
  });

  describe('triggerEvolution', () => {
    beforeEach(() => {
      engine.registry.registerArchetype({
        id: 'aggro',
        name: 'Aggressive',
        coreCards: ['strike', 'bash'],
        bonuses: { damage: 0.1 }
      });
      engine.initialize({
        synergyRegistry: mockSynergyRegistry,
        metagameTracker: mockMetagameTracker,
        eloRating: mockEloRating,
        energyTuner: mockEnergyTuner
      });
    });

    test('returns success=false when trigger check fails', () => {
      const gameState = {
        deckCards: ['defend'],
        player: { energy: 10 }
      };
      const result = engine.triggerEvolution('game1', 'aggro', gameState);
      expect(result.success).toBe(false);
    });

    test('consumes energy on successful evolution', () => {
      const gameState = {
        deckCards: ['strike', 'bash'],
        player: { energy: 10 },
        cards: {
          strike: { id: 'strike', damage: 6, cost: 1 },
          bash: { id: 'bash', damage: 8, cost: 2 }
        }
      };
      const result = engine.triggerEvolution('game1', 'aggro', gameState);
      expect(result.success).toBe(true);
      expect(gameState.player.energy).toBeLessThan(10);
    });

    test('unlocks archetype on first evolution', () => {
      expect(engine.registry.getArchetype('aggro').unlocked).toBe(false);
      
      const gameState = {
        deckCards: ['strike', 'bash'],
        player: { energy: 10 },
        cards: {
          strike: { id: 'strike', damage: 6, cost: 1 },
          bash: { id: 'bash', damage: 8, cost: 2 }
        }
      };
      engine.triggerEvolution('game1', 'aggro', gameState);
      
      expect(engine.registry.getArchetype('aggro').unlocked).toBe(true);
    });

    test('increments evolution level', () => {
      const gameState = {
        deckCards: ['strike', 'bash'],
        player: { energy: 10 },
        cards: {
          strike: { id: 'strike', damage: 6, cost: 1 },
          bash: { id: 'bash', damage: 8, cost: 2 }
        }
      };
      const result = engine.triggerEvolution('game1', 'aggro', gameState);
      
      expect(result.oldLevel).toBe(0);
      expect(result.newLevel).toBe(1);
    });

    test('records active evolution state', () => {
      const gameState = {
        deckCards: ['strike', 'bash'],
        player: { energy: 10 },
        cards: {
          strike: { id: 'strike', damage: 6, cost: 1 },
          bash: { id: 'bash', damage: 8, cost: 2 }
        }
      };
      engine.triggerEvolution('game1', 'aggro', gameState);
      
      const activeEvolution = engine.getActiveEvolution('game1');
      expect(activeEvolution).not.toBeNull();
      expect(activeEvolution.archetypeId).toBe('aggro');
    });
  });

  describe('getSynergyBonus', () => {
    test('returns 0 when no synergy registry', () => {
      const gameState = { deckCards: ['strike'] };
      expect(engine.getSynergyBonus(gameState)).toBe(0);
    });

    test('returns bonus based on synergy chains', () => {
      mockSynergyRegistry.getSynergyChains = jest.fn(() => [
        { synergyId: 'syn_1' },
        { synergyId: 'syn_2' },
        { synergyId: 'syn_3' },
        { synergyId: 'syn_4' },
        { synergyId: 'syn_5' },
        { synergyId: 'syn_6' }
      ]);
      engine.synergyRegistry = mockSynergyRegistry;
      
      const gameState = { deckCards: ['strike'] };
      const bonus = engine.getSynergyBonus(gameState);
      expect(bonus).toBe(25); // capped at 25%
    });
  });

  describe('getSeasonBonus', () => {
    test('returns 0 when no metagame tracker', () => {
      expect(engine.getSeasonBonus()).toBe(0);
    });

    test('returns bonus based on buffed cards', () => {
      engine.metagameTracker = mockMetagameTracker;
      const bonus = engine.getSeasonBonus();
      expect(bonus).toBe(4); // 2 buffed cards * 2% each
    });

    test('caps season bonus at 10%', () => {
      mockMetagameTracker.getEvolutionStatus = jest.fn(() => ({
        buffedCards: ['card1', 'card2', 'card3', 'card4', 'card5', 'card6']
      }));
      engine.metagameTracker = mockMetagameTracker;
      
      const bonus = engine.getSeasonBonus();
      expect(bonus).toBe(10);
    });
  });

  describe('getEloRating', () => {
    test('returns default 1500 when no ELO rating system', () => {
      const gameState = { playerId: 'player1' };
      expect(engine.getEloRating(gameState)).toBe(1500);
    });

    test('returns ELO rating when available', () => {
      engine.eloRating = mockEloRating;
      const gameState = { playerId: 'player1' };
      expect(engine.getEloRating(gameState)).toBe(1600);
    });
  });

  describe('getEvolutionInfo', () => {
    test('returns null for non-existent archetype', () => {
      expect(engine.getEvolutionInfo('non_existent')).toBeNull();
    });

    test('returns evolution info for archetype', () => {
      engine.registry.registerArchetype({
        id: 'aggro',
        name: 'Aggressive',
        coreCards: ['strike'],
        maxEvolutionLevel: 5
      });
      engine.registry.setEvolutionLevel('aggro', 3);
      engine.registry.unlockArchetype('aggro');
      
      const info = engine.getEvolutionInfo('aggro');
      expect(info.id).toBe('aggro');
      expect(info.name).toBe('Aggressive');
      expect(info.level).toBe(3);
      expect(info.maxLevel).toBe(5);
      expect(info.unlocked).toBe(true);
      expect(info.progress).toBe(0.6);
    });
  });

  describe('getAllEvolutionStatus', () => {
    test('returns status for all archetypes', () => {
      engine.registry.registerArchetype({
        id: 'aggro',
        name: 'Aggro',
        coreCards: ['strike']
      });
      engine.registry.registerArchetype({
        id: 'control',
        name: 'Control',
        coreCards: ['defend']
      });
      
      const status = engine.getAllEvolutionStatus();
      expect(status.length).toBe(2);
    });
  });

  describe('validateChapterUnlock', () => {
    test('returns false for non-existent archetype', () => {
      expect(engine.validateChapterUnlock('non_existent', 5)).toBe(false);
    });

    test('returns true when no chapter requirement', () => {
      engine.registry.registerArchetype({
        id: 'aggro',
        name: 'Aggressive',
        coreCards: ['strike']
      });
      
      expect(engine.validateChapterUnlock('aggro', 1)).toBe(true);
    });

    test('returns true when chapter requirement met', () => {
      engine.registry.registerArchetype({
        id: 'aggro',
        name: 'Aggressive',
        coreCards: ['strike']
      });
      engine.setChapterRequirement('aggro', 3);
      
      expect(engine.validateChapterUnlock('aggro', 5)).toBe(true);
    });

    test('returns false when chapter requirement not met', () => {
      engine.registry.registerArchetype({
        id: 'aggro',
        name: 'Aggressive',
        coreCards: ['strike']
      });
      engine.setChapterRequirement('aggro', 5);
      
      expect(engine.validateChapterUnlock('aggro', 3)).toBe(false);
    });
  });

  describe('setChapterRequirement', () => {
    test('sets chapter requirement', () => {
      engine.registry.registerArchetype({
        id: 'aggro',
        name: 'Aggressive',
        coreCards: ['strike']
      });
      
      expect(engine.setChapterRequirement('aggro', 5)).toBe(true);
      expect(engine.registry.getArchetype('aggro').requiredChapter).toBe(5);
    });

    test('returns false for non-existent archetype', () => {
      expect(engine.setChapterRequirement('non_existent', 5)).toBe(false);
    });
  });

  describe('getActiveEvolution', () => {
    test('returns null when no active evolution', () => {
      expect(engine.getActiveEvolution('game1')).toBeNull();
    });

    test('returns active evolution state', () => {
      engine.registry.registerArchetype({
        id: 'aggro',
        name: 'Aggressive',
        coreCards: ['strike', 'bash'],
        bonuses: { damage: 0.1 }
      });
      engine.initialize({ synergyRegistry: mockSynergyRegistry });
      
      const gameState = {
        deckCards: ['strike', 'bash'],
        player: { energy: 10 },
        cards: {
          strike: { id: 'strike', damage: 6, cost: 1 },
          bash: { id: 'bash', damage: 8, cost: 2 }
        }
      };
      engine.triggerEvolution('game1', 'aggro', gameState);
      
      expect(engine.getActiveEvolution('game1')).not.toBeNull();
    });
  });

  describe('clearActiveEvolution', () => {
    test('clears active evolution state', () => {
      engine.registry.registerArchetype({
        id: 'aggro',
        name: 'Aggressive',
        coreCards: ['strike', 'bash'],
        bonuses: { damage: 0.1 }
      });
      engine.initialize({ synergyRegistry: mockSynergyRegistry });
      
      const gameState = {
        deckCards: ['strike', 'bash'],
        player: { energy: 10 },
        cards: {
          strike: { id: 'strike', damage: 6, cost: 1 },
          bash: { id: 'bash', damage: 8, cost: 2 }
        }
      };
      engine.triggerEvolution('game1', 'aggro', gameState);
      engine.clearActiveEvolution('game1');
      
      expect(engine.getActiveEvolution('game1')).toBeNull();
    });
  });

  describe('queueEvolution', () => {
    test('adds evolution to queue', () => {
      engine.queueEvolution('game1', 'aggro');
      expect(engine.getQueueLength()).toBe(1);
    });
  });

  describe('processEvolutionQueue', () => {
    test('processes queued evolutions', () => {
      engine.registry.registerArchetype({
        id: 'aggro',
        name: 'Aggressive',
        coreCards: ['strike', 'bash'],
        bonuses: { damage: 0.1 }
      });
      engine.initialize({ synergyRegistry: mockSynergyRegistry });
      engine.queueEvolution('game1', 'aggro');
      
      const gameState = {
        deckCards: ['strike', 'bash'],
        player: { energy: 10 },
        cards: {
          strike: { id: 'strike', damage: 6, cost: 1 },
          bash: { id: 'bash', damage: 8, cost: 2 }
        }
      };
      
      const results = engine.processEvolutionQueue(gameState);
      expect(results.length).toBe(1);
    });

    test('removes successful evolutions from queue', () => {
      engine.registry.registerArchetype({
        id: 'aggro',
        name: 'Aggressive',
        coreCards: ['strike', 'bash'],
        bonuses: { damage: 0.1 }
      });
      engine.initialize({ synergyRegistry: mockSynergyRegistry });
      engine.queueEvolution('game1', 'aggro');
      
      const gameState = {
        deckCards: ['strike', 'bash'],
        player: { energy: 10 },
        cards: {
          strike: { id: 'strike', damage: 6, cost: 1 },
          bash: { id: 'bash', damage: 8, cost: 2 }
        }
      };
      
      engine.processEvolutionQueue(gameState);
      expect(engine.getQueueLength()).toBe(0);
    });
  });

  describe('clearQueue', () => {
    test('clears evolution queue', () => {
      engine.queueEvolution('game1', 'aggro');
      engine.queueEvolution('game2', 'control');
      engine.clearQueue();
      expect(engine.getQueueLength()).toBe(0);
    });
  });
});

describe('Integration tests', () => {
  let engine;
  let registry;

  beforeEach(() => {
    engine = new ArchetypeEngine();
    registry = engine.registry;
  });

  test('full evolution workflow', () => {
    // Register archetypes
    registry.registerArchetype({
      id: 'aggro',
      name: 'Aggressive',
      coreCards: ['strike', 'bash', 'heavy_strike'],
      bonuses: { damage: 0.15 }
    });
    
    registry.registerArchetype({
      id: 'control',
      name: 'Control',
      coreCards: ['defend', 'bash'],
      bonuses: { block: 0.1 }
    });

    // Set up evolution path
    registry.registerEvolutionPath('aggro', [
      { level: 1, bonus: 'damage_boost_1' },
      { level: 2, bonus: 'damage_boost_2' },
      { level: 3, bonus: 'unlock_special' }
    ]);

    // Initialize dependencies
    engine.initialize({
      synergyRegistry: {
        getSynergyChains: () => [{ synergyId: 'syn_1' }, { synergyId: 'syn_2' }]
      },
      metagameTracker: {
        getEvolutionStatus: () => ({ buffedCards: ['card1'] })
      },
      eloRating: {
        getRating: () => 1650
      }
    });

    // Unlock archetype
    expect(registry.unlockArchetype('aggro')).toBe(true);
    expect(registry.getEvolutionLevel('aggro')).toBe(0);

    // Set chapter requirement
    engine.setChapterRequirement('aggro', 2);
    expect(engine.validateChapterUnlock('aggro', 3)).toBe(true);

    // Simulate evolution
    const gameState = {
      gameId: 'game_1',
      playerId: 'player_1',
      deckId: 'deck_aggro',
      deckCards: ['strike', 'bash', 'heavy_strike'],
      player: { energy: 10 },
      playedCards: ['strike', 'bash'],
      triggeredSynergies: ['syn_1'],
      cards: {
        strike: { id: 'strike', damage: 6, cost: 1 },
        bash: { id: 'bash', damage: 8, cost: 2 },
        heavy_strike: { id: 'heavy_strike', damage: 12, cost: 3 }
      }
    };

    const triggerResult = engine.checkEvolutionTrigger('aggro', gameState);
    expect(triggerResult.triggered).toBe(true);

    const evolutionResult = engine.triggerEvolution('game_1', 'aggro', gameState);
    expect(evolutionResult.success).toBe(true);
    expect(evolutionResult.oldLevel).toBe(0);
    expect(evolutionResult.newLevel).toBe(1);
    expect(evolutionResult.evolvedCards.length).toBeGreaterThan(0);

    // Verify evolution info
    const info = engine.getEvolutionInfo('aggro');
    expect(info.level).toBe(1);
    expect(info.unlocked).toBe(true);

    // Queue and process another evolution
    engine.queueEvolution('game_2', 'aggro');
    expect(engine.getQueueLength()).toBe(1);
    
    gameState.player.energy = 10;
    const queueResults = engine.processEvolutionQueue(gameState);
    expect(queueResults[0].success).toBe(true);
    expect(engine.getQueueLength()).toBe(0);

    // Verify final state
    const finalInfo = engine.getEvolutionInfo('aggro');
    expect(finalInfo.level).toBe(2);
  });
});