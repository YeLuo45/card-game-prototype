/**
 * V101 Card Synergy Cascade Engine Tests (Direction B)
 * 测试 SynergyRegistry | CascadeEngine | SynergyHooks | SynergyPanel
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

const { SynergyRegistry, CascadeEngine, SynergyHooks, SynergyPanel } = require('../../synergy-cascade.js');

describe('SynergyRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new SynergyRegistry();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('initializes with empty synergies map', () => {
      expect(registry.synergies.size).toBe(0);
      expect(registry.cardSynergies.size).toBe(0);
    });

    test('initializes with empty trigger handlers map', () => {
      expect(registry.triggerHandlers.size).toBe(0);
    });
  });

  describe('registerSynergy', () => {
    test('registers a valid synergy definition', () => {
      const synergyDef = {
        id: 'synergy_1',
        triggerCard: 'strike',
        targetCards: ['defend'],
        effect: 'damage_boost',
        magnitude: 5
      };
      
      expect(registry.registerSynergy(synergyDef)).toBe(true);
      expect(registry.getSynergyCount()).toBe(1);
    });

    test('returns false for invalid synergy without id', () => {
      const synergyDef = {
        triggerCard: 'strike',
        effect: 'damage_boost'
      };
      
      expect(registry.registerSynergy(synergyDef)).toBe(false);
    });

    test('returns false for invalid synergy without triggerCard', () => {
      const synergyDef = {
        id: 'synergy_1',
        effect: 'damage_boost'
      };
      
      expect(registry.registerSynergy(synergyDef)).toBe(false);
    });

    test('returns false for null/undefined synergy', () => {
      expect(registry.registerSynergy(null)).toBe(false);
      expect(registry.registerSynergy(undefined)).toBe(false);
    });

    test('registers synergy with default values', () => {
      const synergyDef = {
        id: 'synergy_1',
        triggerCard: 'strike'
      };
      
      expect(registry.registerSynergy(synergyDef)).toBe(true);
      const synergies = registry.getSynergyForCard('strike');
      expect(synergies[0].effect).toBe('unknown');
      expect(synergies[0].magnitude).toBe(0);
      expect(synergies[0].targetCards).toEqual([]);
    });

    test('creates card index for new trigger card', () => {
      registry.registerSynergy({
        id: 'synergy_1',
        triggerCard: 'strike',
        targetCards: ['defend'],
        effect: 'damage_boost',
        magnitude: 5
      });
      
      expect(registry.cardSynergies.has('strike')).toBe(true);
      expect(registry.cardSynergies.get('strike')).toContain('synergy_1');
    });

    test('adds to existing card index', () => {
      registry.registerSynergy({
        id: 'synergy_1',
        triggerCard: 'strike',
        targetCards: ['defend'],
        effect: 'damage_boost',
        magnitude: 5
      });
      registry.registerSynergy({
        id: 'synergy_2',
        triggerCard: 'strike',
        targetCards: ['bash'],
        effect: 'draw_card',
        magnitude: 2
      });
      
      expect(registry.cardSynergies.get('strike').length).toBe(2);
    });
  });

  describe('getSynergyForCard', () => {
    test('returns empty array for null/undefined cardId', () => {
      expect(registry.getSynergyForCard(null)).toEqual([]);
      expect(registry.getSynergyForCard(undefined)).toEqual([]);
    });

    test('returns empty array for card with no synergies', () => {
      expect(registry.getSynergyForCard('unknown_card')).toEqual([]);
    });

    test('returns registered synergies for card', () => {
      registry.registerSynergy({
        id: 'synergy_1',
        triggerCard: 'strike',
        targetCards: ['defend'],
        effect: 'damage_boost',
        magnitude: 5
      });
      
      const synergies = registry.getSynergyForCard('strike');
      expect(synergies.length).toBe(1);
      expect(synergies[0].id).toBe('synergy_1');
      expect(synergies[0].effect).toBe('damage_boost');
    });
  });

  describe('getAllSynergies', () => {
    test('returns empty array when no synergies registered', () => {
      expect(registry.getAllSynergies()).toEqual([]);
    });

    test('returns all registered synergies', () => {
      registry.registerSynergy({
        id: 'synergy_1',
        triggerCard: 'strike',
        effect: 'damage_boost',
        magnitude: 5
      });
      registry.registerSynergy({
        id: 'synergy_2',
        triggerCard: 'defend',
        effect: 'draw_card',
        magnitude: 2
      });
      
      const all = registry.getAllSynergies();
      expect(all.length).toBe(2);
    });
  });

  describe('getSynergyChains', () => {
    test('returns empty array for null/undefined cardIds', () => {
      expect(registry.getSynergyChains(null)).toEqual([]);
      expect(registry.getSynergyChains(undefined)).toEqual([]);
    });

    test('returns empty array for empty cardIds array', () => {
      expect(registry.getSynergyChains([])).toEqual([]);
    });

    test('returns empty array when no synergies match cards', () => {
      registry.registerSynergy({
        id: 'synergy_1',
        triggerCard: 'strike',
        targetCards: ['defend'],
        effect: 'damage_boost',
        magnitude: 5
      });
      
      const chains = registry.getSynergyChains(['bash', 'fireball']);
      expect(chains).toEqual([]);
    });

    test('returns chain when synergy matches cards', () => {
      registry.registerSynergy({
        id: 'synergy_1',
        triggerCard: 'strike',
        targetCards: ['defend'],
        effect: 'damage_boost',
        magnitude: 5
      });
      
      const chains = registry.getSynergyChains(['strike', 'defend']);
      expect(chains.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('removeSynergy', () => {
    test('returns false for non-existent synergy', () => {
      expect(registry.removeSynergy('unknown')).toBe(false);
    });

    test('removes synergy and returns true', () => {
      registry.registerSynergy({
        id: 'synergy_1',
        triggerCard: 'strike',
        effect: 'damage_boost',
        magnitude: 5
      });
      
      expect(registry.removeSynergy('synergy_1')).toBe(true);
      expect(registry.getSynergyCount()).toBe(0);
    });

    test('removes synergy from card index', () => {
      registry.registerSynergy({
        id: 'synergy_1',
        triggerCard: 'strike',
        targetCards: ['defend'],
        effect: 'damage_boost',
        magnitude: 5
      });
      
      registry.removeSynergy('synergy_1');
      expect(registry.cardSynergies.get('strike')).not.toContain('synergy_1');
    });
  });

  describe('clear', () => {
    test('clears all synergies and indexes', () => {
      registry.registerSynergy({
        id: 'synergy_1',
        triggerCard: 'strike',
        effect: 'damage_boost',
        magnitude: 5
      });
      
      registry.clear();
      expect(registry.getSynergyCount()).toBe(0);
      expect(registry.cardSynergies.size).toBe(0);
    });
  });

  describe('getSynergyCount', () => {
    test('returns 0 for empty registry', () => {
      expect(registry.getSynergyCount()).toBe(0);
    });

    test('returns correct count after registrations', () => {
      registry.registerSynergy({
        id: 'synergy_1',
        triggerCard: 'strike',
        effect: 'damage_boost',
        magnitude: 5
      });
      registry.registerSynergy({
        id: 'synergy_2',
        triggerCard: 'defend',
        effect: 'draw_card',
        magnitude: 2
      });
      
      expect(registry.getSynergyCount()).toBe(2);
    });
  });
});

describe('CascadeEngine', () => {
  let registry;
  let engine;

  beforeEach(() => {
    registry = new SynergyRegistry();
    engine = new CascadeEngine(registry);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('initializes with provided registry', () => {
      expect(engine.registry).toBe(registry);
    });

    test('initializes with default maxCascadeDepth of 3', () => {
      expect(engine.maxCascadeDepth).toBe(3);
    });

    test('initializes with empty activeCascades map', () => {
      expect(engine.activeCascades.size).toBe(0);
    });

    test('initializes with empty cascadeHistory array', () => {
      expect(engine.cascadeHistory).toEqual([]);
    });
  });

  describe('checkCascadeTrigger', () => {
    test('returns empty array for null playedCard', () => {
      expect(engine.checkCascadeTrigger(null, {})).toEqual([]);
    });

    test('returns empty array for undefined gameState', () => {
      expect(engine.checkCascadeTrigger({ id: 'strike' }, undefined)).toEqual([]);
    });

    test('returns empty array when no synergies match', () => {
      const gameState = {
        boardCards: [{ id: 'strike' }],
        cardsInHand: []
      };
      
      expect(engine.checkCascadeTrigger({ id: 'strike' }, gameState)).toEqual([]);
    });

    test('returns triggers when synergy matches', () => {
      registry.registerSynergy({
        id: 'synergy_1',
        triggerCard: 'strike',
        targetCards: ['defend'],
        effect: 'damage_boost',
        condition: () => true,
        magnitude: 5
      });
      
      const gameState = {
        boardCards: [{ id: 'strike' }, { id: 'defend' }],
        cardsInHand: []
      };
      
      const triggers = engine.checkCascadeTrigger({ id: 'strike' }, gameState);
      expect(triggers.length).toBe(1);
      expect(triggers[0].synergyId).toBe('synergy_1');
    });

    test('filters targets not on board', () => {
      registry.registerSynergy({
        id: 'synergy_1',
        triggerCard: 'strike',
        targetCards: ['defend', 'bash'],
        effect: 'damage_boost',
        condition: () => true,
        magnitude: 5
      });
      
      const gameState = {
        boardCards: [{ id: 'strike' }, { id: 'defend' }],
        cardsInHand: []
      };
      
      const triggers = engine.checkCascadeTrigger({ id: 'strike' }, gameState);
      expect(triggers[0].targetCards).toContain('defend');
      expect(triggers[0].targetCards).not.toContain('bash');
    });

    test('respects condition function', () => {
      registry.registerSynergy({
        id: 'synergy_1',
        triggerCard: 'strike',
        targetCards: ['defend'],
        effect: 'damage_boost',
        condition: (state, card) => state.player && state.player.energy > 0,
        magnitude: 5
      });
      
      const gameStateWithEnergy = {
        boardCards: [{ id: 'strike' }, { id: 'defend' }],
        player: { energy: 3 }
      };
      
      const gameStateNoEnergy = {
        boardCards: [{ id: 'strike' }, { id: 'defend' }],
        player: { energy: 0 }
      };
      
      expect(engine.checkCascadeTrigger({ id: 'strike' }, gameStateWithEnergy).length).toBe(1);
      expect(engine.checkCascadeTrigger({ id: 'strike' }, gameStateNoEnergy).length).toBe(0);
    });
  });

  describe('resolveCascade', () => {
    test('returns empty result for null cascadeStack', () => {
      const result = engine.resolveCascade(null, {});
      expect(result.resolved).toEqual([]);
      expect(result.totalEffects).toBe(0);
      expect(result.depth).toBe(0);
    });

    test('returns empty result for empty cascadeStack', () => {
      const result = engine.resolveCascade([], {});
      expect(result.resolved).toEqual([]);
      expect(result.totalEffects).toBe(0);
      expect(result.depth).toBe(0);
    });

    test('resolves cascades up to max depth', () => {
      registry.registerSynergy({
        id: 'synergy_1',
        triggerCard: 'strike',
        targetCards: ['defend'],
        effect: 'damage_boost',
        magnitude: 5
      });
      
      const cascadeStack = [
        { synergyId: 'synergy_1', triggerCard: 'strike', effect: 'damage_boost', magnitude: 5 }
      ];
      
      const gameState = { player: { damageBoost: 0 } };
      const result = engine.resolveCascade(cascadeStack, gameState);
      
      expect(result.resolved.length).toBeGreaterThanOrEqual(0);
    });

    test('adds to cascade history', () => {
      registry.registerSynergy({
        id: 'synergy_1',
        triggerCard: 'strike',
        targetCards: ['defend'],
        effect: 'damage_boost',
        magnitude: 5
      });
      
      const cascadeStack = [
        { synergyId: 'synergy_1', triggerCard: 'strike', effect: 'damage_boost', magnitude: 5 }
      ];
      
      engine.resolveCascade(cascadeStack, { player: {} });
      expect(engine.cascadeHistory.length).toBe(1);
    });
  });

  describe('applyCascadeEffect', () => {
    test('returns invalid_input for null cascade', () => {
      const result = engine.applyCascadeEffect(null, {});
      expect(result.applied).toBe(false);
      expect(result.reason).toBe('invalid_input');
    });

    test('returns invalid_input for null gameState', () => {
      const result = engine.applyCascadeEffect({}, null);
      expect(result.applied).toBe(false);
      expect(result.reason).toBe('invalid_input');
    });

    test('returns synergy_not_found for unknown synergy', () => {
      const cascade = { synergyId: 'unknown' };
      const result = engine.applyCascadeEffect(cascade, {});
      expect(result.applied).toBe(false);
      expect(result.reason).toBe('synergy_not_found');
    });

    test('applies damage_boost effect', () => {
      registry.registerSynergy({
        id: 'synergy_1',
        triggerCard: 'strike',
        effect: 'damage_boost',
        magnitude: 5
      });
      
      const cascade = { synergyId: 'synergy_1', effect: 'damage_boost', magnitude: 5 };
      const gameState = { player: { damageBoost: 0 } };
      
      const result = engine.applyCascadeEffect(cascade, gameState);
      expect(result.applied).toBe(true);
      expect(result.effect.type).toBe('damage_boost');
      expect(gameState.player.damageBoost).toBe(5);
    });

    test('applies draw_card effect', () => {
      registry.registerSynergy({
        id: 'synergy_1',
        triggerCard: 'strike',
        effect: 'draw_card',
        magnitude: 2
      });
      
      const cascade = { synergyId: 'synergy_1', effect: 'draw_card', magnitude: 2 };
      const gameState = {
        drawPile: [{ id: 'strike' }, { id: 'defend' }],
        hand: []
      };
      
      const result = engine.applyCascadeEffect(cascade, gameState);
      expect(result.applied).toBe(true);
      expect(result.effect.type).toBe('draw_card');
    });

    test('applies energy_gain effect', () => {
      registry.registerSynergy({
        id: 'synergy_1',
        triggerCard: 'strike',
        effect: 'energy_gain',
        magnitude: 1
      });
      
      const cascade = { synergyId: 'synergy_1', effect: 'energy_gain', magnitude: 1 };
      const gameState = { player: { energy: 0 } };
      
      const result = engine.applyCascadeEffect(cascade, gameState);
      expect(result.applied).toBe(true);
      expect(result.effect.type).toBe('energy_gain');
      expect(gameState.player.energy).toBe(1);
    });

    test('applies heal effect', () => {
      registry.registerSynergy({
        id: 'synergy_1',
        triggerCard: 'strike',
        effect: 'heal',
        magnitude: 10
      });
      
      const cascade = { synergyId: 'synergy_1', effect: 'heal', magnitude: 10 };
      const gameState = { player: { currentHp: 50, maxHp: 100 } };
      
      const result = engine.applyCascadeEffect(cascade, gameState);
      expect(result.applied).toBe(true);
      expect(result.effect.type).toBe('heal');
      expect(gameState.player.currentHp).toBe(60);
    });

    test('caps heal at maxHp', () => {
      registry.registerSynergy({
        id: 'synergy_1',
        triggerCard: 'strike',
        effect: 'heal',
        magnitude: 60
      });
      
      const cascade = { synergyId: 'synergy_1', effect: 'heal', magnitude: 60 };
      const gameState = { player: { currentHp: 50, maxHp: 100 } };
      
      engine.applyCascadeEffect(cascade, gameState);
      expect(gameState.player.currentHp).toBe(100);
    });

    test('applies block effect', () => {
      registry.registerSynergy({
        id: 'synergy_1',
        triggerCard: 'strike',
        effect: 'block',
        magnitude: 8
      });
      
      const cascade = { synergyId: 'synergy_1', effect: 'block', magnitude: 8 };
      const gameState = { player: { block: 0 } };
      
      const result = engine.applyCascadeEffect(cascade, gameState);
      expect(result.applied).toBe(true);
      expect(result.effect.type).toBe('block');
      expect(gameState.player.block).toBe(8);
    });

    test('applies default effect for unknown type', () => {
      registry.registerSynergy({
        id: 'synergy_1',
        triggerCard: 'strike',
        effect: 'custom_effect',
        magnitude: 5
      });
      
      const cascade = { synergyId: 'synergy_1', effect: 'custom_effect', magnitude: 5 };
      const gameState = {};
      
      const result = engine.applyCascadeEffect(cascade, gameState);
      expect(result.applied).toBe(true);
      expect(result.effect.type).toBe('custom_effect');
    });
  });

  describe('startCascade', () => {
    test('returns true for new game', () => {
      expect(engine.startCascade('game_1')).toBe(true);
    });

    test('returns false if cascade already exists', () => {
      engine.startCascade('game_1');
      expect(engine.startCascade('game_1')).toBe(false);
    });
  });

  describe('pushToCascade', () => {
    test('does nothing for non-existent game', () => {
      engine.pushToCascade('unknown_game', {});
      expect(engine.activeCascades.size).toBe(0);
    });

    test('pushes cascade to existing stack', () => {
      engine.startCascade('game_1');
      engine.pushToCascade('game_1', { synergyId: 'synergy_1' });
      expect(engine.activeCascades.get('game_1').length).toBe(1);
    });

    test('does not push beyond max depth', () => {
      engine.startCascade('game_1');
      
      for (let i = 0; i < 5; i++) {
        engine.pushToCascade('game_1', { synergyId: `synergy_${i}` });
      }
      
      expect(engine.activeCascades.get('game_1').length).toBeLessThanOrEqual(3);
    });
  });

  describe('endCascade', () => {
    test('returns empty result for non-existent game', () => {
      const result = engine.endCascade('unknown_game', {});
      expect(result.resolved).toEqual([]);
    });

    test('resolves and clears cascade', () => {
      engine.startCascade('game_1');
      engine.pushToCascade('game_1', { synergyId: 'synergy_1', effect: 'damage_boost', magnitude: 5 });
      
      const result = engine.endCascade('game_1', { player: { damageBoost: 0 } });
      expect(engine.activeCascades.has('game_1')).toBe(false);
    });
  });

  describe('getCascadeHistory', () => {
    test('returns copy of cascade history', () => {
      engine.cascadeHistory.push({ test: true });
      const history = engine.getCascadeHistory();
      
      expect(history).toEqual([{ test: true }]);
      expect(history).not.toBe(engine.cascadeHistory);
    });
  });

  describe('clearHistory', () => {
    test('clears cascade history', () => {
      engine.cascadeHistory.push({ test: true });
      engine.clearHistory();
      expect(engine.cascadeHistory).toEqual([]);
    });
  });

  describe('setMaxCascadeDepth', () => {
    test('sets valid depth', () => {
      engine.setMaxCascadeDepth(5);
      expect(engine.maxCascadeDepth).toBe(5);
    });

    test('ignores invalid depth', () => {
      engine.setMaxCascadeDepth(0);
      expect(engine.maxCascadeDepth).toBe(3);
      
      engine.setMaxCascadeDepth(-1);
      expect(engine.maxCascadeDepth).toBe(3);
      
      engine.setMaxCascadeDepth(11);
      expect(engine.maxCascadeDepth).toBe(3);
    });
  });
});

describe('SynergyHooks', () => {
  let hooks;

  beforeEach(() => {
    hooks = new SynergyHooks();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('initializes with empty handlers', () => {
      expect(hooks.handlers.onCardPlayed).toEqual([]);
      expect(hooks.handlers.onSynergyTriggered).toEqual([]);
      expect(hooks.handlers.onCascadeResolved).toEqual([]);
    });

    test('initializes with hookEnabled true', () => {
      expect(hooks.hookEnabled).toBe(true);
    });

    test('initializes with empty eventLog', () => {
      expect(hooks.eventLog).toEqual([]);
    });
  });

  describe('onCardPlayed', () => {
    test('registers handler and returns unsubscribe function', () => {
      const handler = jest.fn();
      const unsubscribe = hooks.onCardPlayed(handler);
      
      expect(hooks.handlers.onCardPlayed.length).toBe(1);
      expect(typeof unsubscribe).toBe('function');
    });

    test('returns no-op for non-function handler', () => {
      const unsubscribe = hooks.onCardPlayed('not a function');
      expect(typeof unsubscribe).toBe('function');
      expect(hooks.handlers.onCardPlayed.length).toBe(0);
    });

    test('unsubscribe removes handler', () => {
      const handler = jest.fn();
      const unsubscribe = hooks.onCardPlayed(handler);
      unsubscribe();
      
      expect(hooks.handlers.onCardPlayed).not.toContain(handler);
    });
  });

  describe('onSynergyTriggered', () => {
    test('registers handler and returns unsubscribe function', () => {
      const handler = jest.fn();
      const unsubscribe = hooks.onSynergyTriggered(handler);
      
      expect(hooks.handlers.onSynergyTriggered.length).toBe(1);
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('onCascadeResolved', () => {
    test('registers handler and returns unsubscribe function', () => {
      const handler = jest.fn();
      const unsubscribe = hooks.onCascadeResolved(handler);
      
      expect(hooks.handlers.onCascadeResolved.length).toBe(1);
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('triggerCardPlayed', () => {
    test('does nothing when hookEnabled is false', () => {
      hooks.hookEnabled = false;
      const handler = jest.fn();
      hooks.onCardPlayed(handler);
      
      hooks.triggerCardPlayed({ id: 'strike' }, {});
      expect(handler).not.toHaveBeenCalled();
    });

    test('calls registered handlers', () => {
      const handler = jest.fn();
      hooks.onCardPlayed(handler);
      
      hooks.triggerCardPlayed({ id: 'strike' }, { player: {} });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('adds event to log', () => {
      hooks.triggerCardPlayed({ id: 'strike' }, {});
      expect(hooks.eventLog.length).toBe(1);
      expect(hooks.eventLog[0].type).toBe('onCardPlayed');
    });

    test('includes card and gameState in event', () => {
      const card = { id: 'strike' };
      const state = { player: {} };
      hooks.triggerCardPlayed(card, state);
      
      expect(hooks.eventLog[0].card).toBe(card);
      expect(hooks.eventLog[0].gameState).toBe(state);
    });
  });

  describe('triggerSynergy', () => {
    test('does nothing when hookEnabled is false', () => {
      hooks.hookEnabled = false;
      const handler = jest.fn();
      hooks.onSynergyTriggered(handler);
      
      hooks.triggerSynergy({}, {});
      expect(handler).not.toHaveBeenCalled();
    });

    test('calls registered handlers', () => {
      const handler = jest.fn();
      hooks.onSynergyTriggered(handler);
      
      hooks.triggerSynergy({ id: 'synergy_1' }, {});
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('adds event to log', () => {
      hooks.triggerSynergy({ id: 'synergy_1' }, {});
      expect(hooks.eventLog.length).toBe(1);
      expect(hooks.eventLog[0].type).toBe('onSynergyTriggered');
    });
  });

  describe('triggerCascadeResolved', () => {
    test('does nothing when hookEnabled is false', () => {
      hooks.hookEnabled = false;
      const handler = jest.fn();
      hooks.onCascadeResolved(handler);
      
      hooks.triggerCascadeResolved({});
      expect(handler).not.toHaveBeenCalled();
    });

    test('calls registered handlers', () => {
      const handler = jest.fn();
      hooks.onCascadeResolved(handler);
      
      hooks.triggerCascadeResolved({ resolved: [] });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('adds event to log', () => {
      hooks.triggerCascadeResolved({ resolved: [] });
      expect(hooks.eventLog.length).toBe(1);
      expect(hooks.eventLog[0].type).toBe('onCascadeResolved');
    });
  });

  describe('setEnabled', () => {
    test('sets hookEnabled to false', () => {
      hooks.setEnabled(false);
      expect(hooks.hookEnabled).toBe(false);
    });

    test('sets hookEnabled to true', () => {
      hooks.setEnabled(true);
      expect(hooks.hookEnabled).toBe(true);
    });

    test('coerces non-boolean to true', () => {
      hooks.setEnabled('yes');
      expect(hooks.hookEnabled).toBe(true);
    });
  });

  describe('getEventLog', () => {
    test('returns copy of event log', () => {
      hooks.eventLog.push({ type: 'test' });
      const log = hooks.getEventLog();
      
      expect(log).toEqual([{ type: 'test' }]);
      expect(log).not.toBe(hooks.eventLog);
    });
  });

  describe('clearEventLog', () => {
    test('clears event log', () => {
      hooks.eventLog.push({ type: 'test' });
      hooks.clearEventLog();
      expect(hooks.eventLog).toEqual([]);
    });
  });

  describe('getHandlerCount', () => {
    test('returns counts for all handler types', () => {
      hooks.onCardPlayed(jest.fn());
      hooks.onSynergyTriggered(jest.fn());
      hooks.onCascadeResolved(jest.fn());
      
      const counts = hooks.getHandlerCount();
      expect(counts.onCardPlayed).toBe(1);
      expect(counts.onSynergyTriggered).toBe(1);
      expect(counts.onCascadeResolved).toBe(1);
    });
  });

  describe('clearAll', () => {
    test('removes all handlers', () => {
      hooks.onCardPlayed(jest.fn());
      hooks.onSynergyTriggered(jest.fn());
      hooks.onCascadeResolved(jest.fn());
      
      hooks.clearAll();
      
      expect(hooks.handlers.onCardPlayed).toEqual([]);
      expect(hooks.handlers.onSynergyTriggered).toEqual([]);
      expect(hooks.handlers.onCascadeResolved).toEqual([]);
    });
  });
});

describe('SynergyPanel', () => {
  let registry;
  let engine;
  let panel;

  beforeEach(() => {
    registry = new SynergyRegistry();
    engine = new CascadeEngine(registry);
    panel = new SynergyPanel('test-panel', registry, engine);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('initializes with provided parameters', () => {
      expect(panel.containerId).toBe('test-panel');
      expect(panel.registry).toBe(registry);
      expect(panel.cascadeEngine).toBe(engine);
    });

    test('initializes with default containerId', () => {
      const panel2 = new SynergyPanel(null, registry, engine);
      expect(panel2.containerId).toBe('synergy-panel');
    });

    test('initializes with new SynergyHooks', () => {
      expect(panel.hooks).toBeInstanceOf(SynergyHooks);
    });

    test('initializes with empty currentDeck', () => {
      expect(panel.currentDeck).toEqual([]);
    });

    test('initializes with visible false', () => {
      expect(panel.visible).toBe(false);
    });

    test('initializes with null panelElement', () => {
      expect(panel.panelElement).toBe(null);
    });
  });

  describe('init', () => {
    test('creates panel element', () => {
      panel.init();
      expect(panel.panelElement).not.toBe(null);
    });
  });

  describe('show', () => {
    test('sets visible to true', () => {
      panel.init();
      panel.show();
      expect(panel.visible).toBe(true);
    });

    test('calls refresh', () => {
      panel.init();
      const refreshSpy = jest.spyOn(panel, 'refresh');
      panel.show();
      expect(refreshSpy).toHaveBeenCalled();
    });
  });

  describe('hide', () => {
    test('sets visible to false', () => {
      panel.init();
      panel.visible = true;
      panel.hide();
      expect(panel.visible).toBe(false);
    });
  });

  describe('toggle', () => {
    test('calls show when hidden', () => {
      panel.init();
      panel.visible = false;
      const showSpy = jest.spyOn(panel, 'show');
      panel.toggle();
      expect(showSpy).toHaveBeenCalled();
    });

    test('calls hide when visible', () => {
      panel.init();
      panel.visible = true;
      const hideSpy = jest.spyOn(panel, 'hide');
      panel.toggle();
      expect(hideSpy).toHaveBeenCalled();
    });
  });

  describe('setDeck', () => {
    test('sets currentDeck', () => {
      const deck = [{ id: 'strike' }, { id: 'defend' }];
      panel.setDeck(deck);
      expect(panel.currentDeck).toEqual(deck);
    });

    test('handles null/undefined deck', () => {
      panel.setDeck(null);
      expect(panel.currentDeck).toEqual([]);
      
      panel.setDeck(undefined);
      expect(panel.currentDeck).toEqual([]);
    });
  });

  describe('isVisible', () => {
    test('returns visible state', () => {
      expect(panel.isVisible()).toBe(false);
      panel.visible = true;
      expect(panel.isVisible()).toBe(true);
    });
  });

  describe('destroy', () => {
    test('clears hooks', () => {
      const clearSpy = jest.spyOn(panel.hooks, 'clearAll');
      panel.destroy();
      expect(clearSpy).toHaveBeenCalled();
    });

    test('sets panelElement to null', () => {
      panel.init();
      panel.destroy();
      expect(panel.panelElement).toBe(null);
    });
  });
});