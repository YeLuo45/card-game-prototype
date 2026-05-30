/**
 * V102 Replay Analysis & AI Coach System Tests (Direction C)
 * 测试 ReplayStorage | ReplayAnalyzer | DeckAdvisorAgent | OpponentModelAgent
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
    'bash': { id: 'bash', name: 'Bash', damage: 8, cost: 2, type: 'attack' }
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

const { ReplayStorage, ReplayAnalyzer, DeckAdvisorAgent, OpponentModelAgent } = require('../../replay-analysis.js');

describe('ReplayStorage', () => {
  let storage;

  beforeEach(() => {
    storage = new ReplayStorage();
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('initializes with correct prefixes', () => {
      expect(storage.REPLAY_PREFIX).toBe('replay_');
      expect(storage.INDEX_KEY).toBe('replay_index');
    });

    test('initializes with default MAX_REPLAYS of 100', () => {
      expect(storage.MAX_REPLAYS).toBe(100);
    });
  });

  describe('saveReplay', () => {
    test('returns false for null replayId', () => {
      expect(storage.saveReplay(null, {})).toBe(false);
    });

    test('returns false for undefined replayId', () => {
      expect(storage.saveReplay(undefined, {})).toBe(false);
    });

    test('returns false for null gameState', () => {
      expect(storage.saveReplay('replay_1', null)).toBe(false);
    });

    test('saves valid replay to localStorage', () => {
      const gameState = {
        playerHealth: 50,
        enemyHealth: 30,
        turn: 5,
        outcome: 'win'
      };
      
      expect(storage.saveReplay('replay_1', gameState)).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    test('saves replay with correct key format', () => {
      const gameState = { turn: 1 };
      storage.saveReplay('test_replay', gameState);
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'replay_test_replay',
        expect.any(String)
      );
    });

    test('updates index after saving', () => {
      storage.saveReplay('replay_1', { turn: 1 });
      expect(mockStorage['replay_index']).toBeDefined();
    });

    test('handles localStorage error gracefully', () => {
      localStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full');
      });
      
      expect(storage.saveReplay('replay_1', { turn: 1 })).toBe(false);
    });
  });

  describe('loadReplay', () => {
    test('returns null for null replayId', () => {
      expect(storage.loadReplay(null)).toBeNull();
    });

    test('returns null for undefined replayId', () => {
      expect(storage.loadReplay(undefined)).toBeNull();
    });

    test('returns null for non-existent replay', () => {
      expect(storage.loadReplay('non_existent')).toBeNull();
    });

    test('returns parsed replay data', () => {
      const gameState = { playerHealth: 50, turn: 5 };
      mockStorage['replay_test'] = JSON.stringify({
        replayId: 'test',
        timestamp: Date.now(),
        gameState,
        metadata: { outcome: 'win' }
      });
      
      const result = storage.loadReplay('test');
      expect(result).not.toBeNull();
      expect(result.gameState.playerHealth).toBe(50);
    });

    test('handles corrupted JSON gracefully', () => {
      mockStorage['replay_bad'] = 'invalid json {';
      expect(storage.loadReplay('bad')).toBeNull();
    });
  });

  describe('listReplays', () => {
    test('returns empty array when no replays', () => {
      expect(storage.listReplays()).toEqual([]);
    });

    test('returns all replays without filter', () => {
      mockStorage['replay_1'] = JSON.stringify({
        replayId: '1',
        timestamp: Date.now(),
        gameState: {},
        metadata: { outcome: 'win' }
      });
      mockStorage['replay_2'] = JSON.stringify({
        replayId: '2',
        timestamp: Date.now(),
        gameState: {},
        metadata: { outcome: 'loss' }
      });
      mockStorage['replay_index'] = JSON.stringify(['1', '2']);
      
      const result = storage.listReplays();
      expect(result.length).toBe(2);
    });

    test('filters by outcome', () => {
      mockStorage['replay_1'] = JSON.stringify({
        replayId: '1',
        timestamp: Date.now(),
        gameState: {},
        metadata: { outcome: 'win' }
      });
      mockStorage['replay_2'] = JSON.stringify({
        replayId: '2',
        timestamp: Date.now(),
        gameState: {},
        metadata: { outcome: 'loss' }
      });
      mockStorage['replay_index'] = JSON.stringify(['1', '2']);
      
      const result = storage.listReplays({ outcome: 'win' });
      expect(result.length).toBe(1);
      expect(result[0].outcome).toBe('win');
    });

    test('filters by fromDate', () => {
      const oldTime = Date.now() - 10000;
      const newTime = Date.now();
      
      mockStorage['replay_old'] = JSON.stringify({
        replayId: 'old',
        timestamp: oldTime,
        gameState: {},
        metadata: {}
      });
      mockStorage['replay_new'] = JSON.stringify({
        replayId: 'new',
        timestamp: newTime,
        gameState: {},
        metadata: {}
      });
      mockStorage['replay_index'] = JSON.stringify(['old', 'new']);
      
      const result = storage.listReplays({ fromDate: oldTime + 1000 });
      expect(result.length).toBe(1);
      expect(result[0].replayId).toBe('new');
    });

    test('filters by toDate', () => {
      const oldTime = Date.now() - 10000;
      const newTime = Date.now();
      
      mockStorage['replay_old'] = JSON.stringify({
        replayId: 'old',
        timestamp: oldTime,
        gameState: {},
        metadata: {}
      });
      mockStorage['replay_new'] = JSON.stringify({
        replayId: 'new',
        timestamp: newTime,
        gameState: {},
        metadata: {}
      });
      mockStorage['replay_index'] = JSON.stringify(['old', 'new']);
      
      const result = storage.listReplays({ toDate: oldTime + 1000 });
      expect(result.length).toBe(1);
      expect(result[0].replayId).toBe('old');
    });

    test('filters by deckId', () => {
      mockStorage['replay_1'] = JSON.stringify({
        replayId: '1',
        timestamp: Date.now(),
        gameState: { playerDeck: { id: 'deck_a' } },
        metadata: {}
      });
      mockStorage['replay_2'] = JSON.stringify({
        replayId: '2',
        timestamp: Date.now(),
        gameState: { playerDeck: { id: 'deck_b' } },
        metadata: {}
      });
      mockStorage['replay_index'] = JSON.stringify(['1', '2']);
      
      const result = storage.listReplays({ deckId: 'deck_a' });
      expect(result.length).toBe(1);
      expect(result[0].replayId).toBe('1');
    });

    test('sorts by timestamp descending', () => {
      const oldTime = Date.now() - 10000;
      const newTime = Date.now();
      
      mockStorage['replay_old'] = JSON.stringify({
        replayId: 'old',
        timestamp: oldTime,
        gameState: {},
        metadata: {}
      });
      mockStorage['replay_new'] = JSON.stringify({
        replayId: 'new',
        timestamp: newTime,
        gameState: {},
        metadata: {}
      });
      mockStorage['replay_index'] = JSON.stringify(['old', 'new']);
      
      const result = storage.listReplays();
      expect(result[0].replayId).toBe('new');
      expect(result[1].replayId).toBe('old');
    });

    test('handles missing metadata gracefully', () => {
      mockStorage['replay_no_meta'] = JSON.stringify({
        replayId: 'no_meta',
        timestamp: Date.now(),
        gameState: {}
      });
      mockStorage['replay_index'] = JSON.stringify(['no_meta']);
      
      const result = storage.listReplays();
      expect(result.length).toBe(1);
      expect(result[0].outcome).toBeUndefined();
    });
  });

  describe('deleteReplay', () => {
    test('returns false for null replayId', () => {
      expect(storage.deleteReplay(null)).toBe(false);
    });

    test('deletes replay from localStorage', () => {
      mockStorage['replay_to_delete'] = JSON.stringify({
        replayId: 'to_delete',
        timestamp: Date.now(),
        gameState: {},
        metadata: {}
      });
      mockStorage['replay_index'] = JSON.stringify(['to_delete']);
      
      expect(storage.deleteReplay('to_delete')).toBe(true);
      expect(localStorage.removeItem).toHaveBeenCalledWith('replay_to_delete');
    });

    test('updates index after deletion', () => {
      mockStorage['replay_1'] = JSON.stringify({ replayId: '1', timestamp: Date.now(), gameState: {}, metadata: {} });
      mockStorage['replay_2'] = JSON.stringify({ replayId: '2', timestamp: Date.now(), gameState: {}, metadata: {} });
      mockStorage['replay_index'] = JSON.stringify(['1', '2']);
      
      storage.deleteReplay('1');
      const index = JSON.parse(mockStorage['replay_index']);
      expect(index).not.toContain('1');
      expect(index).toContain('2');
    });

    test('handles non-existent replay gracefully', () => {
      expect(storage.deleteReplay('non_existent')).toBe(true); // Returns true even if not found
    });
  });

  describe('clearAll', () => {
    test('removes all replay data', () => {
      mockStorage['replay_1'] = 'data1';
      mockStorage['replay_2'] = 'data2';
      mockStorage['replay_index'] = '["1","2"]';
      
      storage.clearAll();
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('replay_index');
      expect(localStorage.removeItem).toHaveBeenCalledWith('replay_1');
      expect(localStorage.removeItem).toHaveBeenCalledWith('replay_2');
    });
  });

  describe('getReplayCount', () => {
    test('returns 0 when no replays', () => {
      expect(storage.getReplayCount()).toBe(0);
    });

    test('returns correct count', () => {
      mockStorage['replay_index'] = JSON.stringify(['1', '2', '3']);
      expect(storage.getReplayCount()).toBe(3);
    });
  });

  describe('_getIndex', () => {
    test('returns empty array when no index', () => {
      expect(storage._getIndex()).toEqual([]);
    });

    test('returns parsed index', () => {
      mockStorage['replay_index'] = JSON.stringify(['1', '2']);
      expect(storage._getIndex()).toEqual(['1', '2']);
    });

    test('handles corrupted index gracefully', () => {
      mockStorage['replay_index'] = 'invalid';
      expect(storage._getIndex()).toEqual([]);
    });
  });

  describe('_updateIndex', () => {
    test('adds new replay to index', () => {
      storage._updateIndex('new_replay');
      const index = JSON.parse(mockStorage['replay_index']);
      expect(index).toContain('new_replay');
    });

    test('removes duplicate if exists', () => {
      mockStorage['replay_index'] = JSON.stringify(['old', 'duplicate']);
      storage._updateIndex('duplicate');
      const index = JSON.parse(mockStorage['replay_index']);
      const duplicates = index.filter(x => x === 'duplicate');
      expect(duplicates.length).toBe(1);
    });

    test('adds new replay to beginning', () => {
      mockStorage['replay_index'] = JSON.stringify(['first']);
      storage._updateIndex('new');
      const index = JSON.parse(mockStorage['replay_index']);
      expect(index[0]).toBe('new');
    });

    test('removes oldest when exceeding MAX_REPLAYS', () => {
      // First populate with 3 replays
      mockStorage['replay_1'] = 'data1';
      mockStorage['replay_2'] = 'data2';
      mockStorage['replay_3'] = 'data3';
      mockStorage['replay_index'] = JSON.stringify(['1', '2', '3']);
      storage.MAX_REPLAYS = 2;
      storage._updateIndex('4');
      
      const index = JSON.parse(mockStorage['replay_index']);
      expect(index.length).toBe(2);
      // Should contain 4 (newest added) and 1 (kept because 4 came first when added)
      // The algorithm removes from the end, so 2 and 3 are removed
      expect(index).toContain('4');
      expect(index).toContain('1');
    });
  });

  describe('_removeFromIndex', () => {
    test('removes replay from index', () => {
      mockStorage['replay_index'] = JSON.stringify(['1', '2', '3']);
      storage._removeFromIndex('2');
      
      const index = JSON.parse(mockStorage['replay_index']);
      expect(index).not.toContain('2');
      expect(index).toEqual(['1', '3']);
    });

    test('handles non-existent replay', () => {
      mockStorage['replay_index'] = JSON.stringify(['1', '2']);
      storage._removeFromIndex('non_existent');
      
      const index = JSON.parse(mockStorage['replay_index']);
      expect(index.length).toBe(2);
    });
  });

  describe('_sanitizeGameState', () => {
    test('deep copies game state', () => {
      const original = { turn: 1, playerHealth: 50 };
      const result = storage._sanitizeGameState(original);
      
      result.turn = 999;
      expect(original.turn).toBe(1);
    });

    test('truncates hand to last 10 cards', () => {
      const state = {
        hand: Array.from({ length: 20 }, (_, i) => ({ id: 'card_' + i }))
      };
      const result = storage._sanitizeGameState(state);
      
      expect(result.hand.length).toBe(10);
      expect(result.hand[0].id).toBe('card_10'); // Last 10 cards
    });
  });
});

describe('ReplayAnalyzer', () => {
  let storage;
  let analyzer;

  beforeEach(() => {
    storage = new ReplayStorage();
    analyzer = new ReplayAnalyzer(storage);
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('initializes with provided storage', () => {
      const customStorage = new ReplayStorage();
      const customAnalyzer = new ReplayAnalyzer(customStorage);
      expect(customAnalyzer.storage).toBe(customStorage);
    });

    test('creates default storage if not provided', () => {
      expect(analyzer.storage).toBeInstanceOf(ReplayStorage);
    });

    test('initializes MISTAKE_THRESHOLD', () => {
      expect(analyzer.MISTAKE_THRESHOLD).toBe(0.7);
    });
  });

  describe('analyzeReplay', () => {
    test('returns null for non-existent replay', () => {
      expect(analyzer.analyzeReplay('non_existent')).toBeNull();
    });

    test('returns analysis result for valid replay', () => {
      mockStorage['replay_test'] = JSON.stringify({
        replayId: 'test',
        timestamp: Date.now(),
        gameState: { turn: 5, playerHealth: 30 },
        metadata: { outcome: 'win' }
      });
      mockStorage['replay_index'] = JSON.stringify(['test']);
      
      const result = analyzer.analyzeReplay('test');
      expect(result).not.toBeNull();
      expect(result.replayId).toBe('test');
      expect(result.score).toBeDefined();
    });

    test('calculates score based on mistakes', () => {
      mockStorage['replay_test'] = JSON.stringify({
        replayId: 'test',
        timestamp: Date.now(),
        gameState: { turn: 20, playerHealth: 10, enemyHealth: 5 },
        metadata: { outcome: 'win' }
      });
      mockStorage['replay_index'] = JSON.stringify(['test']);
      
      const result = analyzer.analyzeReplay('test');
      expect(result.score).toBeLessThan(100);
    });

    test('extracts key events', () => {
      mockStorage['replay_test'] = JSON.stringify({
        replayId: 'test',
        timestamp: Date.now(),
        gameState: { turn: 5, playerHealth: 50, enemyHealth: 30 },
        metadata: { outcome: 'win' }
      });
      mockStorage['replay_index'] = JSON.stringify(['test']);
      
      const result = analyzer.analyzeReplay('test');
      expect(result.keyEvents).toBeDefined();
      expect(Array.isArray(result.keyEvents)).toBe(true);
    });

    test('generates summary', () => {
      mockStorage['replay_test'] = JSON.stringify({
        replayId: 'test',
        timestamp: Date.now(),
        gameState: { turn: 5, playerHealth: 50 },
        metadata: { outcome: 'win' }
      });
      mockStorage['replay_index'] = JSON.stringify(['test']);
      
      const result = analyzer.analyzeReplay('test');
      expect(result.summary).toBeDefined();
      expect(typeof result.summary).toBe('string');
    });
  });

  describe('findMistakes', () => {
    test('returns empty array for null replay', () => {
      expect(analyzer.findMistakes(null)).toEqual([]);
    });

    test('returns empty array for replay without gameState', () => {
      expect(analyzer.findMistakes({})).toEqual([]);
    });

    test('detects health management mistakes', () => {
      const replay = {
        gameState: {
          turn: 10,
          playerHealth: 20,
          enemyHealth: 40
        }
      };
      
      const mistakes = analyzer.findMistakes(replay);
      const healthMistakes = mistakes.filter(m => m.type === 'health_management');
      expect(healthMistakes.length).toBeGreaterThan(0);
    });

    test('detects energy waste', () => {
      const replay = {
        gameState: {
          turn: 5,
          energy: 3,
          maxEnergy: 3
        }
      };
      
      const mistakes = analyzer.findMistakes(replay);
      const energyMistakes = mistakes.filter(m => m.type === 'energy_waste');
      expect(energyMistakes.length).toBeGreaterThan(0);
    });

    test('detects tempo control issues', () => {
      const replay = {
        gameState: {
          turn: 20,
          playerHealth: 60
        }
      };
      
      const mistakes = analyzer.findMistakes(replay);
      const tempoMistakes = mistakes.filter(m => m.type === 'tempo');
      expect(tempoMistakes.length).toBeGreaterThan(0);
    });

    test('detects missed finish', () => {
      const replay = {
        gameState: {
          turn: 20,
          enemyHealth: 5,
          playerHealth: 30
        }
      };
      
      const mistakes = analyzer.findMistakes(replay);
      const finishMistakes = mistakes.filter(m => m.type === 'finish');
      expect(finishMistakes.length).toBeGreaterThan(0);
    });
  });

  describe('suggestImprovements', () => {
    test('returns empty array for null replay', () => {
      expect(analyzer.suggestImprovements(null)).toEqual([]);
    });

    test('returns empty array for replay without gameState', () => {
      expect(analyzer.suggestImprovements({})).toEqual([]);
    });

    test('generates suggestions from mistakes', () => {
      const replay = {
        gameState: {
          turn: 20,
          playerHealth: 10,
          enemyHealth: 30
        }
      };
      
      const improvements = analyzer.suggestImprovements(replay);
      expect(improvements.length).toBeGreaterThan(0);
    });

    test('generates survival suggestion for loss', () => {
      const replay = {
        gameState: {
          turn: 10,
          outcome: 'loss',
          playerHealth: 0
        }
      };
      
      const improvements = analyzer.suggestImprovements(replay);
      const survivalSuggestions = improvements.filter(i => i.type === 'survival');
      expect(survivalSuggestions.length).toBeGreaterThan(0);
    });

    test('generates efficiency suggestion for long win', () => {
      const replay = {
        gameState: {
          turn: 20,
          outcome: 'win',
          playerHealth: 50
        }
      };
      
      const improvements = analyzer.suggestImprovements(replay);
      const efficiencySuggestions = improvements.filter(i => i.type === 'efficiency');
      expect(efficiencySuggestions.length).toBeGreaterThan(0);
    });

    test('deduplicates suggestions', () => {
      const replay = {
        gameState: {
          turn: 20,
          playerHealth: 10,
          enemyHealth: 5
        }
      };
      
      const improvements = analyzer.suggestImprovements(replay);
      const uniqueKeys = new Set(improvements.map(i => i.type + i.message));
      expect(uniqueKeys.size).toBe(improvements.length);
    });
  });

  describe('_analyzeHealthManagement', () => {
    test('detects low health situation', () => {
      const gameState = { turn: 10, playerHealth: 20, enemyHealth: 40 };
      const mistakes = analyzer._analyzeHealthManagement(gameState);
      expect(mistakes.some(m => m.type === 'health_management')).toBe(true);
    });

    test('returns empty for good health management', () => {
      const gameState = { turn: 5, playerHealth: 50, enemyHealth: 20 };
      const mistakes = analyzer._analyzeHealthManagement(gameState);
      expect(mistakes.length).toBe(0);
    });
  });

  describe('_analyzeEnergyUsage', () => {
    test('detects energy waste in early turns', () => {
      const gameState = { turn: 5, energy: 3, maxEnergy: 3 };
      const mistakes = analyzer._analyzeEnergyUsage(gameState);
      expect(mistakes.some(m => m.type === 'energy_waste')).toBe(true);
    });

    test('returns empty for proper energy usage', () => {
      const gameState = { turn: 2, energy: 1, maxEnergy: 3 };
      const mistakes = analyzer._analyzeEnergyUsage(gameState);
      expect(mistakes.length).toBe(0);
    });
  });

  describe('_analyzeCardChoice', () => {
    test('returns empty array (placeholder implementation)', () => {
      const gameState = { playedCards: ['strike', 'defend'] };
      const mistakes = analyzer._analyzeCardChoice(gameState);
      expect(Array.isArray(mistakes)).toBe(true);
    });
  });

  describe('_analyzeTempoControl', () => {
    test('detects slow game', () => {
      const gameState = { turn: 15, playerHealth: 60 };
      const mistakes = analyzer._analyzeTempoControl(gameState);
      expect(mistakes.some(m => m.type === 'tempo')).toBe(true);
    });

    test('detects missed finish opportunity', () => {
      const gameState = { turn: 20, enemyHealth: 5, playerHealth: 30 };
      const mistakes = analyzer._analyzeTempoControl(gameState);
      expect(mistakes.some(m => m.type === 'finish')).toBe(true);
    });
  });

  describe('_mistakeToSuggestion', () => {
    test('maps health_management mistake', () => {
      const mistake = { type: 'health_management', suggestion: 'Test suggestion' };
      const suggestion = analyzer._mistakeToSuggestion(mistake);
      expect(suggestion).not.toBeNull();
      expect(suggestion.type).toBe('strategy');
    });

    test('maps energy_waste mistake', () => {
      const mistake = { type: 'energy_waste' };
      const suggestion = analyzer._mistakeToSuggestion(mistake);
      expect(suggestion).not.toBeNull();
      expect(suggestion.type).toBe('efficiency');
    });

    test('maps tempo mistake', () => {
      const mistake = { type: 'tempo' };
      const suggestion = analyzer._mistakeToSuggestion(mistake);
      expect(suggestion).not.toBeNull();
      expect(suggestion.type).toBe('strategy');
    });

    test('maps finish mistake', () => {
      const mistake = { type: 'finish' };
      const suggestion = analyzer._mistakeToSuggestion(mistake);
      expect(suggestion).not.toBeNull();
      expect(suggestion.type).toBe('skill');
    });

    test('returns null for unknown mistake type', () => {
      const mistake = { type: 'unknown_type' };
      const suggestion = analyzer._mistakeToSuggestion(mistake);
      expect(suggestion).toBeNull();
    });
  });

  describe('_generateGeneralSuggestions', () => {
    test('generates survival suggestion for loss with zero health', () => {
      const gameState = { outcome: 'loss', playerHealth: 0 };
      const suggestions = analyzer._generateGeneralSuggestions(gameState);
      expect(suggestions.some(s => s.type === 'survival')).toBe(true);
    });

    test('generates efficiency suggestion for long win', () => {
      const gameState = { outcome: 'win', turn: 20 };
      const suggestions = analyzer._generateGeneralSuggestions(gameState);
      expect(suggestions.some(s => s.type === 'efficiency')).toBe(true);
    });

    test('returns empty for normal games', () => {
      const gameState = { outcome: 'win', turn: 10 };
      const suggestions = analyzer._generateGeneralSuggestions(gameState);
      expect(suggestions.length).toBe(0);
    });
  });

  describe('_calculateScore', () => {
    test('starts at 100 base score', () => {
      const score = analyzer._calculateScore([], []);
      expect(score).toBe(100);
    });

    test('deducts 15 for high severity mistakes', () => {
      const mistakes = [{ severity: 'high' }, { severity: 'high' }];
      const score = analyzer._calculateScore(mistakes, []);
      expect(score).toBe(70);
    });

    test('deducts 8 for medium severity mistakes', () => {
      const mistakes = [{ severity: 'medium' }];
      const score = analyzer._calculateScore(mistakes, []);
      expect(score).toBe(92);
    });

    test('deducts 3 for low severity mistakes', () => {
      const mistakes = [{ severity: 'low' }];
      const score = analyzer._calculateScore(mistakes, []);
      expect(score).toBe(97);
    });

    test('adds points for improvements (max 10, then clamped to 100)', () => {
      // Score is clamped to max 100, so improvements only add up to 0 effective
      const improvements = Array(10).fill({ type: 'test', message: 'msg' });
      const score = analyzer._calculateScore([], improvements);
      // 100 + min(10, 10)*2 = 120, but clamped to 100
      expect(score).toBe(100);
    });

    test('clamps score to 0-100 range', () => {
      const manyMistakes = Array(20).fill({ severity: 'high' });
      const score = analyzer._calculateScore(manyMistakes, []);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('_generateSummary', () => {
    test('returns Excellent for score >= 90', () => {
      const summary = analyzer._generateSummary(95, [], []);
      expect(summary).toBe('Excellent performance');
    });

    test('returns Good for score >= 75', () => {
      const summary = analyzer._generateSummary(80, [], []);
      expect(summary).toBe('Good performance with minor mistakes');
    });

    test('returns Average for score >= 60', () => {
      const summary = analyzer._generateSummary(65, [], []);
      expect(summary).toBe('Average performance, room for improvement');
    });

    test('returns Needs significant improvement for high severity mistakes', () => {
      const mistakes = [{ severity: 'high' }, { severity: 'high' }];
      const summary = analyzer._generateSummary(50, mistakes, []);
      expect(summary).toBe('Needs significant improvement');
    });

    test('returns Below average for low score without high severity', () => {
      const summary = analyzer._generateSummary(40, [{ severity: 'low' }], []);
      expect(summary).toBe('Below average performance');
    });
  });

  describe('_extractKeyEvents', () => {
    test('extracts turn progress event', () => {
      const gameState = { turn: 5, playerHealth: 50, enemyHealth: 30 };
      const events = analyzer._extractKeyEvents(gameState);
      expect(events.length).toBeGreaterThan(0);
      // First event should be the turn progress
      expect(events[0].turn).toBe(5);
      expect(events[0].event).toBe('game_progress');
    });

    test('returns empty array for empty gameState', () => {
      const events = analyzer._extractKeyEvents({});
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('analyzeMultiple', () => {
    test('analyzes multiple replays', () => {
      mockStorage['replay_1'] = JSON.stringify({
        replayId: '1',
        timestamp: Date.now(),
        gameState: { turn: 5, playerHealth: 50 },
        metadata: {}
      });
      mockStorage['replay_2'] = JSON.stringify({
        replayId: '2',
        timestamp: Date.now(),
        gameState: { turn: 10, playerHealth: 30 },
        metadata: {}
      });
      mockStorage['replay_index'] = JSON.stringify(['1', '2']);
      
      const results = analyzer.analyzeMultiple(['1', '2']);
      expect(results.length).toBe(2);
    });

    test('skips non-existent replays', () => {
      mockStorage['replay_1'] = JSON.stringify({
        replayId: '1',
        timestamp: Date.now(),
        gameState: { turn: 5 },
        metadata: {}
      });
      mockStorage['replay_index'] = JSON.stringify(['1']);
      
      const results = analyzer.analyzeMultiple(['1', 'non_existent']);
      expect(results.length).toBe(1);
    });
  });

  describe('getStats', () => {
    test('returns empty stats for empty results', () => {
      const stats = analyzer.getStats([]);
      expect(stats.count).toBe(0);
      expect(stats.avgScore).toBe(0);
      expect(stats.commonMistakes).toEqual([]);
    });

    test('calculates average score', () => {
      const results = [
        { score: 80, mistakes: [{ type: 'tempo' }] },
        { score: 90, mistakes: [{ type: 'tempo' }, { type: 'energy_waste' }] }
      ];
      
      const stats = analyzer.getStats(results);
      expect(stats.count).toBe(2);
      expect(stats.avgScore).toBe(85);
    });

    test('identifies common mistakes', () => {
      const results = [
        { mistakes: [{ type: 'tempo' }, { type: 'energy_waste' }] },
        { mistakes: [{ type: 'tempo' }, { type: 'tempo' }] }
      ];
      
      const stats = analyzer.getStats(results);
      expect(stats.commonMistakes[0].type).toBe('tempo');
      expect(stats.commonMistakes[0].count).toBe(3);
    });

    test('limits common mistakes to top 5', () => {
      const results = [
        { mistakes: [
          { type: 'a' }, { type: 'b' }, { type: 'c' }, { type: 'd' }, { type: 'e' }, { type: 'f' }
        ]}
      ];
      
      const stats = analyzer.getStats(results);
      expect(stats.commonMistakes.length).toBeLessThanOrEqual(5);
    });
  });
});

describe('DeckAdvisorAgent', () => {
  let agent;
  let mockMemory;

  beforeEach(() => {
    mockMemory = {
      getCardPriorities: jest.fn(() => ({ strike: { priority: 0.8 } })),
      getPlayerSOPs: jest.fn(() => [{ patternKey: 'strike->defend' }])
    };
    agent = new DeckAdvisorAgent(mockMemory);
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('initializes with provided memory', () => {
      expect(agent.memory).toBe(mockMemory);
    });

    test('initializes with null memory if not provided', () => {
      const agentNoMemory = new DeckAdvisorAgent();
      expect(agentNoMemory.memory).toBeNull();
    });

    test('initializes DECK_ANALYSIS_KEY', () => {
      expect(agent.DECK_ANALYSIS_KEY).toBe('deck_advisor_analysis');
    });
  });

  describe('analyzeDeck', () => {
    test('returns null for null deckId', () => {
      expect(agent.analyzeDeck(null)).toBeNull();
    });

    test('returns null for undefined deckId', () => {
      expect(agent.analyzeDeck(undefined)).toBeNull();
    });

    test('returns null for non-existent deck', () => {
      expect(agent.analyzeDeck('non_existent_deck')).toBeNull();
    });

    test('returns analysis result for valid deck', () => {
      mockStorage['metagame_deck_test_deck'] = JSON.stringify({
        playCount: 10,
        winCount: 6,
        winRate: 0.6,
        avgDamage: 20
      });
      
      const result = agent.analyzeDeck('test_deck');
      expect(result).not.toBeNull();
      expect(result.deckId).toBe('test_deck');
      expect(result.strengths).toBeDefined();
      expect(result.weaknesses).toBeDefined();
    });

    test('includes memory analysis when memory provided', () => {
      mockStorage['metagame_deck_test_deck'] = JSON.stringify({
        playCount: 5,
        winCount: 3
      });
      
      const result = agent.analyzeDeck('test_deck');
      expect(result.memoryAnalysis).toBeDefined();
      expect(result.memoryAnalysis.l2Priorities).toBeDefined();
    });

    test('saves analysis to history', () => {
      mockStorage['metagame_deck_test_deck'] = JSON.stringify({
        playCount: 5,
        winCount: 3
      });
      
      agent.analyzeDeck('test_deck');
      
      const key = 'deck_advisor_analysis_test_deck';
      expect(mockStorage[key]).toBeDefined();
    });

    test('includes recommended strategy', () => {
      mockStorage['metagame_deck_test_deck'] = JSON.stringify({
        playCount: 10,
        winCount: 7,
        avgTurns: 12
      });
      
      const result = agent.analyzeDeck('test_deck');
      expect(result.recommendedStrategy).toBeDefined();
      expect(result.recommendedStrategy.primary).toBeDefined();
    });
  });

  describe('suggestMatchupStrategy', () => {
    test('returns default strategy when player deck not found', () => {
      const strategy = agent.suggestMatchupStrategy('non_existent', 'opponent');
      expect(strategy.recommendation).toBe('稳健策略');
    });

    test('returns default strategy when opponent deck not found', () => {
      mockStorage['metagame_deck_player'] = JSON.stringify({ playCount: 5 });
      const strategy = agent.suggestMatchupStrategy('player', 'non_existent');
      expect(strategy.recommendation).toBe('稳健策略');
    });

    test('returns strategy for valid matchup', () => {
      mockStorage['metagame_deck_aggro'] = JSON.stringify({
        playCount: 10,
        avgDamage: 20,
        avgTurns: 8
      });
      mockStorage['metagame_deck_control'] = JSON.stringify({
        playCount: 10,
        avgDamage: 8,
        avgTurns: 18
      });
      
      const strategy = agent.suggestMatchupStrategy('aggro', 'control');
      expect(strategy).not.toBeNull();
      expect(strategy.recommendation).toBeDefined();
      expect(strategy.winCondition).toBeDefined();
    });

    test('calculates matchup advantage', () => {
      mockStorage['metagame_deck_aggro'] = JSON.stringify({
        playCount: 10,
        avgDamage: 20,
        avgTurns: 8
      });
      mockStorage['metagame_deck_control'] = JSON.stringify({
        playCount: 10,
        avgDamage: 8,
        avgTurns: 18
      });
      
      const strategy = agent.suggestMatchupStrategy('aggro', 'control');
      expect(strategy.matchupAdvantage).toBe('unfavorable');
    });

    test('includes side board tips', () => {
      mockStorage['metagame_deck_aggro'] = JSON.stringify({
        playCount: 10,
        avgDamage: 15
      });
      mockStorage['metagame_deck_tempo'] = JSON.stringify({
        playCount: 10,
        avgDamage: 12,
        avgTurns: 12
      });
      
      const strategy = agent.suggestMatchupStrategy('aggro', 'tempo');
      expect(strategy.sideBoardTips).toBeDefined();
      expect(strategy.sideBoardTips.length).toBeGreaterThan(0);
    });
  });

  describe('getAnalysisHistory', () => {
    test('returns empty array when no history', () => {
      expect(agent.getAnalysisHistory('test_deck')).toEqual([]);
    });

    test('returns history from localStorage', () => {
      const history = [
        { deckId: 'test_deck', score: 80, timestamp: Date.now() }
      ];
      mockStorage['deck_advisor_analysis_test_deck'] = JSON.stringify(history);
      
      const result = agent.getAnalysisHistory('test_deck');
      expect(result.length).toBe(1);
    });

    test('handles corrupted JSON gracefully', () => {
      mockStorage['deck_advisor_analysis_test_deck'] = 'invalid';
      expect(agent.getAnalysisHistory('test_deck')).toEqual([]);
    });
  });

  describe('_getDeckData', () => {
    test('returns null for null deckId', () => {
      expect(agent._getDeckData(null)).toBeNull();
    });

    test('returns null for non-existent deck', () => {
      expect(agent._getDeckData('non_existent')).toBeNull();
    });

    test('returns deck data for existing deck', () => {
      mockStorage['metagame_deck_existing'] = JSON.stringify({ playCount: 5 });
      const result = agent._getDeckData('existing');
      expect(result).not.toBeNull();
      expect(result.playCount).toBe(5);
    });
  });

  describe('_getDeckMemory', () => {
    test('returns null when memory not provided', () => {
      const agentNoMemory = new DeckAdvisorAgent(null);
      expect(agentNoMemory._getDeckMemory('deck')).toBeNull();
    });

    test('returns memory data when memory provided', () => {
      const result = agent._getDeckMemory('deck');
      expect(result).not.toBeNull();
      expect(result.l2Priorities).toBeDefined();
      expect(result.l3SOPs).toBeDefined();
    });
  });

  describe('_analyzeStrengths', () => {
    test('identifies high win rate as strength', () => {
      const deck = { winRate: 0.7 };
      const strengths = agent._analyzeStrengths(deck);
      expect(strengths).toContain('高胜率卡组');
    });

    test('identifies high damage as strength', () => {
      const deck = { avgDamage: 20 };
      const strengths = agent._analyzeStrengths(deck);
      expect(strengths).toContain('高伤害输出');
    });

    test('identifies fast games as strength', () => {
      const deck = { avgTurns: 10 };
      const strengths = agent._analyzeStrengths(deck);
      expect(strengths).toContain('快速结束战斗');
    });

    test('returns empty for weak deck', () => {
      const deck = { winRate: 0.3, avgDamage: 5, avgTurns: 20 };
      const strengths = agent._analyzeStrengths(deck);
      expect(strengths.length).toBe(0);
    });
  });

  describe('_analyzeWeaknesses', () => {
    test('identifies low win rate as weakness', () => {
      const deck = { winRate: 0.3 };
      const weaknesses = agent._analyzeWeaknesses(deck);
      expect(weaknesses).toContain('胜率偏低');
    });

    test('identifies long games as weakness', () => {
      const deck = { avgTurns: 20 };
      const weaknesses = agent._analyzeWeaknesses(deck);
      expect(weaknesses).toContain('对局时间过长');
    });

    test('returns empty for strong deck', () => {
      const deck = { winRate: 0.6, avgTurns: 10 };
      const weaknesses = agent._analyzeWeaknesses(deck);
      expect(weaknesses.length).toBe(0);
    });
  });

  describe('_classifyDeck', () => {
    test('classifies as aggro for high damage', () => {
      const deck = { avgDamage: 20, avgTurns: 8 };
      expect(agent._classifyDeck(deck)).toBe('aggro');
    });

    test('classifies as control for long games', () => {
      const deck = { avgDamage: 10, avgTurns: 18 };
      expect(agent._classifyDeck(deck)).toBe('control');
    });

    test('classifies as tempo for good win rate', () => {
      const deck = { avgDamage: 12, avgTurns: 12, winRate: 0.6 };
      expect(agent._classifyDeck(deck)).toBe('tempo');
    });

    test('defaults to balanced', () => {
      const deck = { avgDamage: 10, avgTurns: 12, winRate: 0.45 };
      expect(agent._classifyDeck(deck)).toBe('balanced');
    });
  });

  describe('_generateStrategy', () => {
    test('generates aggro strategy for aggro deck', () => {
      const deck = { avgDamage: 20, avgTurns: 8 };
      const result = agent._generateStrategy(deck, [], []);
      expect(result.primary).toContain('快速进攻');
    });

    test('generates control strategy for control deck', () => {
      const deck = { avgDamage: 8, avgTurns: 18 };
      const result = agent._generateStrategy(deck, [], []);
      expect(result.primary).toContain('稳健防守');
    });

    test('includes strengths in strategy', () => {
      const deck = { deckType: 'balanced' };
      const strengths = ['高胜率卡组'];
      const result = agent._generateStrategy(deck, strengths, []);
      expect(result.strengths).toContain('高胜率卡组');
    });

    test('includes weaknesses in strategy', () => {
      const deck = { deckType: 'balanced' };
      const weaknesses = ['胜率偏低'];
      const result = agent._generateStrategy(deck, [], weaknesses);
      expect(result.weaknesses).toContain('胜率偏低');
    });
  });

  describe('_generateMatchupStrategy', () => {
    test('generates defensive strategy vs aggro', () => {
      const playerDeck = { avgDamage: 10 };
      const opponentDeck = { avgDamage: 20, avgTurns: 8 };
      const result = agent._generateMatchupStrategy(playerDeck, opponentDeck, 'aggro');
      expect(result.recommendation).toBe('防御优先，保护血量');
      expect(result.keepResources).toBe(true);
    });

    test('generates aggressive strategy vs control', () => {
      const playerDeck = { avgDamage: 20 };
      const opponentDeck = { avgDamage: 8, avgTurns: 18 };
      const result = agent._generateMatchupStrategy(playerDeck, opponentDeck, 'control');
      expect(result.recommendation).toBe('保持压力，不给对手喘息机会');
      expect(result.keepResources).toBe(false);
    });

    test('returns default strategy for unknown type', () => {
      const playerDeck = { avgDamage: 10 };
      const opponentDeck = { avgDamage: 10 };
      const result = agent._generateMatchupStrategy(playerDeck, opponentDeck, 'unknown');
      expect(result.keepResources).toBe(true);
    });
  });

  describe('_calculateMatchup', () => {
    test('returns unfavorable for aggro vs control', () => {
      const playerDeck = { avgDamage: 20, avgTurns: 8 };
      const opponentDeck = { avgDamage: 8, avgTurns: 18 };
      expect(agent._calculateMatchup(playerDeck, opponentDeck)).toBe('unfavorable');
    });

    test('returns favorable for control vs aggro', () => {
      const playerDeck = { avgDamage: 8, avgTurns: 18 };
      const opponentDeck = { avgDamage: 20, avgTurns: 8 };
      expect(agent._calculateMatchup(playerDeck, opponentDeck)).toBe('favorable');
    });

    test('returns neutral for same types', () => {
      const playerDeck = { avgDamage: 15, avgTurns: 12 };
      const opponentDeck = { avgDamage: 15, avgTurns: 12 };
      expect(agent._calculateMatchup(playerDeck, opponentDeck)).toBe('neutral');
    });
  });

  describe('_generateSideboardTips', () => {
    test('returns aggro tips vs aggro opponent', () => {
      const tips = agent._generateSideboardTips('aggro');
      expect(tips).toContain('预留足够的防御卡');
    });

    test('returns control tips vs control opponent', () => {
      const tips = agent._generateSideboardTips('control');
      expect(tips).toContain('准备去除关键卡牌的手段');
    });

    test('returns balanced tips for unknown type', () => {
      const tips = agent._generateSideboardTips('unknown');
      expect(tips).toContain('灵活调整策略');
    });
  });

  describe('_getOpponentHistory', () => {
    test('returns empty array when no memory', () => {
      const agentNoMemory = new DeckAdvisorAgent(null);
      expect(agentNoMemory._getOpponentHistory('opponent')).toEqual([]);
    });

    test('filters SOPs by opponentId', () => {
      mockMemory.getPlayerSOPs.mockReturnValue([
        { patternKey: 'strike->defend', opponentId: 'opp_1' },
        { patternKey: 'bash->fireball', opponentId: 'opp_2' }
      ]);
      
      const history = agent._getOpponentHistory('opp_1');
      expect(history.length).toBe(1);
      expect(history[0].patternKey).toBe('strike->defend');
    });
  });

  describe('_adaptFromHistory', () => {
    test('returns null for empty history', () => {
      const result = agent._adaptFromHistory([]);
      expect(result).toBeNull();
    });

    test('returns null for null history', () => {
      const result = agent._adaptFromHistory(null);
      expect(result).toBeNull();
    });

    test('identifies most common pattern', () => {
      const history = [
        { patternKey: 'strike->defend', usageCount: 3 },
        { patternKey: 'strike->defend', usageCount: 2 },
        { patternKey: 'bash->fireball', usageCount: 1 }
      ];
      
      const result = agent._adaptFromHistory(history);
      expect(result.likelyPlayPattern).toBe('strike->defend');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('_identifyKeyCards', () => {
    test('returns empty array (placeholder)', () => {
      const result = agent._identifyKeyCards({});
      expect(result).toEqual([]);
    });
  });

  describe('_saveAnalysis', () => {
    test('saves analysis to localStorage', () => {
      const result = { deckId: 'test', score: 80 };
      agent._saveAnalysis('test', result);
      
      const key = 'deck_advisor_analysis_test';
      expect(mockStorage[key]).toBeDefined();
    });

    test('limits history to 10 entries', () => {
      // Add 12 entries
      for (let i = 0; i < 12; i++) {
        agent._saveAnalysis('limited', { deckId: 'limited', score: i, timestamp: i });
      }
      
      const history = JSON.parse(mockStorage['deck_advisor_analysis_limited']);
      expect(history.length).toBeLessThanOrEqual(10);
    });
  });

  describe('_defaultStrategy', () => {
    test('returns default strategy object', () => {
      const strategy = agent._defaultStrategy();
      expect(strategy.recommendation).toBe('稳健策略');
      expect(strategy.keepResources).toBe(true);
      expect(strategy.winCondition).toBeDefined();
      expect(strategy.matchupAdvantage).toBe('unknown');
    });
  });
});

describe('OpponentModelAgent', () => {
  let agent;
  let mockMemory;

  beforeEach(() => {
    mockMemory = {
      getPlayerSOPs: jest.fn(() => [])
    };
    agent = new OpponentModelAgent(mockMemory);
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('initializes with provided memory', () => {
      expect(agent.memory).toBe(mockMemory);
    });

    test('initializes with null memory if not provided', () => {
      const agentNoMemory = new OpponentModelAgent();
      expect(agentNoMemory.memory).toBeNull();
    });

    test('initializes MODEL_PREFIX', () => {
      expect(agent.MODEL_PREFIX).toBe('opponent_model_');
    });

    test('initializes TENDENCY_KEY', () => {
      expect(agent.TENDENCY_KEY).toBe('opponent_tendencies');
    });
  });

  describe('modelOpponent', () => {
    test('returns default model for empty history', () => {
      const model = agent.modelOpponent([]);
      expect(model.style).toBe('balanced');
      expect(model.confidence).toBe(0.3);
    });

    test('returns default model for null history', () => {
      const model = agent.modelOpponent(null);
      expect(model.style).toBe('balanced');
    });

    test('detects aggressive style', () => {
      const history = [
        { quickVictory: true, avgDamagePerTurn: 15 },
        { quickVictory: true, avgDamagePerTurn: 12 }
      ];
      
      const model = agent.modelOpponent(history);
      expect(model.style).toBe('aggressive');
    });

    test('detects defensive style', () => {
      const history = [
        { totalShield: 30, comboChains: 0 },
        { totalShield: 25, comboChains: 0 }
      ];
      
      const model = agent.modelOpponent(history);
      expect(model.style).toBe('defensive');
    });

    test('detects combo style', () => {
      const history = [
        { comboChains: 3, totalShield: 10 },
        { comboChains: 4, totalShield: 5 }
      ];
      
      const model = agent.modelOpponent(history);
      expect(model.style).toBe('combo');
    });

    test('analyzes opponent deck type', () => {
      const history = [
        { avgDamagePerTurn: 18, turns: 8 },
        { avgDamagePerTurn: 15, turns: 10 }
      ];
      
      const model = agent.modelOpponent(history);
      expect(model.deckType).toBe('aggro');
    });

    test('calculates confidence based on sample size', () => {
      const history = Array(10).fill({ avgDamagePerTurn: 10, turns: 12 });
      const model = agent.modelOpponent(history);
      expect(model.confidence).toBeGreaterThan(0.5);
    });

    test('saves model to localStorage', () => {
      const history = [
        { opponentId: 'test_opp', avgDamagePerTurn: 12 }
      ];
      
      agent.modelOpponent(history);
      expect(mockStorage['opponent_model_test_opp']).toBeDefined();
    });

    test('includes tendencies in model', () => {
      const history = [
        { playedCards: ['strike', 'defend', 'strike'] },
        { playedCards: ['strike', 'defend', 'strike'] }
      ];
      
      const model = agent.modelOpponent(history);
      expect(model.tendencies).toBeDefined();
      expect(model.tendencies.predictablePatterns).toBeDefined();
    });
  });

  describe('predictNextMove', () => {
    test('returns default prediction for null gameState', () => {
      const prediction = agent.predictNextMove(null);
      expect(prediction.likelyAction).toBe('unknown');
      expect(prediction.confidence).toBe(0);
    });

    test('returns default prediction for missing opponentId', () => {
      const prediction = agent.predictNextMove({});
      expect(prediction.likelyAction).toBe('unknown');
    });

    test('returns default prediction when no model exists', () => {
      const prediction = agent.predictNextMove({ opponentId: 'unknown_opp' });
      expect(prediction.likelyAction).toBe('unknown');
    });

    test('returns prediction based on model', () => {
      mockStorage['opponent_model_known_opp'] = JSON.stringify({
        style: 'aggressive',
        confidence: 0.8,
        tendencies: { predictablePatterns: [] }
      });
      
      const prediction = agent.predictNextMove({
        opponentId: 'known_opp',
        enemyHealth: 10
      });
      
      expect(prediction.likelyAction).toBeDefined();
      expect(prediction.confidence).toBe(0.8);
    });

    test('includes recommended response', () => {
      mockStorage['opponent_model_aggressive_opp'] = JSON.stringify({
        style: 'aggressive',
        confidence: 0.7,
        tendencies: { predictablePatterns: [] }
      });
      
      const prediction = agent.predictNextMove({ opponentId: 'aggressive_opp' });
      expect(prediction.recommendedResponse).toBeDefined();
    });

    test('predicts final_push for low enemy health with aggressive style', () => {
      mockStorage['opponent_model_low_hp_opp'] = JSON.stringify({
        style: 'aggressive',
        confidence: 0.8,
        tendencies: { predictablePatterns: [] }
      });
      
      const prediction = agent.predictNextMove({
        opponentId: 'low_hp_opp',
        enemyHealth: 10
      });
      
      expect(prediction.likelyAction).toBe('final_push');
    });
  });

  describe('getOpponentTendencies', () => {
    test('returns default tendencies for unknown opponent', () => {
      const tendencies = agent.getOpponentTendencies('unknown');
      expect(tendencies.firstActionBias).toBe(0.5);
    });

    test('returns stored tendencies', () => {
      mockStorage['opponent_tendencies_test_opp'] = JSON.stringify({
        firstActionBias: 0.7,
        attackWhenLow: 0.6
      });
      
      const tendencies = agent.getOpponentTendencies('test_opp');
      expect(tendencies.firstActionBias).toBe(0.7);
    });

    test('handles corrupted JSON gracefully', () => {
      mockStorage['opponent_tendencies_bad'] = 'invalid';
      const tendencies = agent.getOpponentTendencies('bad');
      expect(tendencies.firstActionBias).toBe(0.5);
    });
  });

  describe('updateModel', () => {
    test('does nothing for null opponentId', () => {
      expect(agent.updateModel(null, {})).toBeUndefined();
    });

    test('does nothing for null newData', () => {
      expect(agent.updateModel('opponent', null)).toBeUndefined();
    });

    test('saves new data to history', () => {
      agent.updateModel('new_opp', { avgDamagePerTurn: 10 });
      expect(mockStorage['opponent_history_new_opp']).toBeDefined();
    });

    test('limits history to 20 entries', () => {
      // Add 25 entries
      for (let i = 0; i < 25; i++) {
        agent.updateModel('limited_opp', { turn: i });
      }
      
      const history = JSON.parse(mockStorage['opponent_history_limited_opp']);
      expect(history.length).toBeLessThanOrEqual(20);
    });
  });

  describe('_analyzeOpponentStyle', () => {
    test('detects aggressive style from history', () => {
      const history = [{ quickVictory: true, avgDamagePerTurn: 15 }];
      const style = agent._analyzeOpponentStyle(history);
      expect(style).toBe('aggressive');
    });

    test('detects defensive style from history', () => {
      const history = [{ totalShield: 30 }];
      const style = agent._analyzeOpponentStyle(history);
      expect(style).toBe('defensive');
    });

    test('detects combo style from history', () => {
      const history = [{ comboChains: 5 }];
      const style = agent._analyzeOpponentStyle(history);
      expect(style).toBe('combo');
    });

    test('returns balanced for mixed history', () => {
      const history = [
        { quickVictory: true, totalShield: 30, comboChains: 2 }
      ];
      const style = agent._analyzeOpponentStyle(history);
      expect(style).toBe('balanced');
    });
  });

  describe('_analyzeOpponentDeckType', () => {
    test('classifies as aggro for fast high damage games', () => {
      const history = [
        { avgDamagePerTurn: 18, turns: 8 },
        { avgDamagePerTurn: 16, turns: 9 }
      ];
      expect(agent._analyzeOpponentDeckType(history)).toBe('aggro');
    });

    test('classifies as control for long games', () => {
      const history = [
        { avgDamagePerTurn: 8, turns: 18 },
        { avgDamagePerTurn: 7, turns: 20 }
      ];
      expect(agent._analyzeOpponentDeckType(history)).toBe('control');
    });

    test('defaults to midrange', () => {
      const history = [
        { avgDamagePerTurn: 12, turns: 12 }
      ];
      expect(agent._analyzeOpponentDeckType(history)).toBe('midrange');
    });
  });

  describe('_analyzeTendencies', () => {
    test('identifies predictable patterns', () => {
      const history = [
        { playedCards: ['strike', 'defend', 'bash'] },
        { playedCards: ['strike', 'defend', 'bash'] }
      ];
      
      const tendencies = agent._analyzeTendencies(history);
      expect(tendencies.predictablePatterns.length).toBeGreaterThan(0);
    });

    test('calculates pattern reliability', () => {
      const history = [
        { playedCards: ['strike', 'defend'] },
        { playedCards: ['strike', 'defend'] }
      ];
      
      const tendencies = agent._analyzeTendencies(history);
      expect(tendencies.patternReliability).toBeGreaterThan(0);
    });
  });

  describe('_calculateModelConfidence', () => {
    test('returns minimum 0.3 for very few samples', () => {
      const history = [{ turns: 10 }];
      const confidence = agent._calculateModelConfidence(history);
      expect(confidence).toBeGreaterThanOrEqual(0.3);
    });

    test('increases with more samples', () => {
      const fewSamples = [{ turns: 10 }];
      const manySamples = Array(10).fill({ turns: 10 });
      
      const fewConfidence = agent._calculateModelConfidence(fewSamples);
      const manyConfidence = agent._calculateModelConfidence(manySamples);
      
      expect(manyConfidence).toBeGreaterThan(fewConfidence);
    });

    test('decreases with inconsistent styles', () => {
      const consistent = [
        { quickVictory: true, totalShield: 5 },
        { quickVictory: true, totalShield: 5 }
      ];
      const inconsistent = [
        { quickVictory: true, totalShield: 40 },
        { quickVictory: false, totalShield: 5 }
      ];
      
      const consistentConf = agent._calculateModelConfidence(consistent);
      const inconsistentConf = agent._calculateModelConfidence(inconsistent);
      
      expect(consistentConf).toBeGreaterThan(inconsistentConf);
    });
  });

  describe('_predictAction', () => {
    test('predicts final_push for aggressive style and low enemy health', () => {
      const model = { style: 'aggressive', tendencies: { predictablePatterns: [] } };
      const gameState = { enemyHealth: 10 };
      expect(agent._predictAction(model, gameState)).toBe('final_push');
    });

    test('predicts setup_defense for defensive style and high player health', () => {
      const model = { style: 'defensive', tendencies: { predictablePatterns: [] } };
      const gameState = { playerHealth: 40 };
      expect(agent._predictAction(model, gameState)).toBe('setup_defense');
    });

    test('returns standard_play as default', () => {
      const model = { style: 'balanced', tendencies: { predictablePatterns: [] } };
      const gameState = { playerHealth: 20, enemyHealth: 20 };
      expect(agent._predictAction(model, gameState)).toBe('standard_play');
    });
  });

  describe('_buildReasoning', () => {
    test('includes style in reasoning', () => {
      const model = { style: 'aggressive', confidence: 0.8 };
      const reasoning = agent._buildReasoning(model, {});
      expect(reasoning).toContain('aggressive');
    });

    test('includes confidence percentage', () => {
      const model = { style: 'balanced', confidence: 0.75 };
      const reasoning = agent._buildReasoning(model, {});
      expect(reasoning).toContain('75%');
    });
  });

  describe('_getRecommendedResponse', () => {
    test('recommends defensive response vs aggressive', () => {
      const model = { style: 'aggressive' };
      const response = agent._getRecommendedResponse(model, {});
      expect(response).toContain('保持血量优势');
    });

    test('recommends pressure response vs defensive', () => {
      const model = { style: 'defensive' };
      const response = agent._getRecommendedResponse(model, {});
      expect(response).toContain('保持压力');
    });

    test('recommends disruption vs combo', () => {
      const model = { style: 'combo' };
      const response = agent._getRecommendedResponse(model, {});
      expect(response).toContain('打乱对手节奏');
    });

    test('recommends balanced response for balanced style', () => {
      const model = { style: 'balanced' };
      const response = agent._getRecommendedResponse(model, {});
      expect(response).toContain('稳健应对');
    });
  });

  describe('_loadModel', () => {
    test('returns null for unknown opponent', () => {
      expect(agent._loadModel('unknown')).toBeNull();
    });

    test('returns model for known opponent', () => {
      mockStorage['opponent_model_known'] = JSON.stringify({
        style: 'aggressive',
        confidence: 0.8
      });
      
      const model = agent._loadModel('known');
      expect(model).not.toBeNull();
      expect(model.style).toBe('aggressive');
    });
  });

  describe('_saveModel', () => {
    test('saves model to localStorage', () => {
      const model = { style: 'defensive', confidence: 0.7, tendencies: { firstActionBias: 0.5 } };
      agent._saveModel('test_save', model);
      
      expect(mockStorage['opponent_model_test_save']).toBeDefined();
      const savedModel = JSON.parse(mockStorage['opponent_model_test_save']);
      expect(savedModel.style).toBe('defensive');
    });
  });

  describe('_loadHistory', () => {
    test('returns empty array for unknown opponent', () => {
      expect(agent._loadHistory('unknown')).toEqual([]);
    });

    test('returns history for known opponent', () => {
      mockStorage['opponent_history_known'] = JSON.stringify([{ turn: 1 }]);
      const history = agent._loadHistory('known');
      expect(history.length).toBe(1);
    });
  });

  describe('_saveHistory', () => {
    test('saves history to localStorage', () => {
      const history = [{ turn: 1 }, { turn: 2 }];
      agent._saveHistory('test_history', history);
      
      expect(mockStorage['opponent_history_test_history']).toBeDefined();
    });
  });

  describe('_defaultModel', () => {
    test('returns balanced style with low confidence', () => {
      const model = agent._defaultModel();
      expect(model.style).toBe('balanced');
      expect(model.confidence).toBe(0.3);
      expect(model.sampleSize).toBe(0);
    });
  });

  describe('_defaultPrediction', () => {
    test('returns unknown action with zero confidence', () => {
      const prediction = agent._defaultPrediction();
      expect(prediction.likelyAction).toBe('unknown');
      expect(prediction.confidence).toBe(0);
    });

    test('includes default recommended response', () => {
      const prediction = agent._defaultPrediction();
      expect(prediction.recommendedResponse).toContain('稳健策略');
    });
  });

  describe('_defaultTendencies', () => {
    test('returns default tendency values', () => {
      const tendencies = agent._defaultTendencies();
      expect(tendencies.firstActionBias).toBe(0.5);
      expect(tendencies.attackWhenLow).toBe(0.5);
      expect(tendencies.savePowerCards).toBe(0.5);
      expect(tendencies.predictablePatterns).toEqual([]);
    });
  });
});

// Integration tests
describe('Replay Analysis Integration', () => {
  let storage;
  let analyzer;
  let deckAdvisor;
  let opponentModel;

  beforeEach(() => {
    storage = new ReplayStorage();
    analyzer = new ReplayAnalyzer(storage);
    
    const mockMemory = {
      getCardPriorities: jest.fn(() => ({ strike: { priority: 0.8 } })),
      getPlayerSOPs: jest.fn(() => [])
    };
    deckAdvisor = new DeckAdvisorAgent(mockMemory);
    opponentModel = new OpponentModelAgent(mockMemory);
    
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    jest.clearAllMocks();
  });

  test('full replay analysis workflow', () => {
    // Save a replay
    const gameState = {
      turn: 15,
      playerHealth: 30,
      enemyHealth: 20,
      outcome: 'win'
    };
    
    storage.saveReplay('integration_test', gameState);
    
    // Analyze the replay
    const analysis = analyzer.analyzeReplay('integration_test');
    expect(analysis).not.toBeNull();
    expect(analysis.score).toBeLessThan(100);
    expect(analysis.mistakes.length).toBeGreaterThan(0);
  });

  test('multiple replay analysis stats', () => {
    // Save multiple replays
    for (let i = 0; i < 3; i++) {
      storage.saveReplay('multi_' + i, {
        turn: 10 + i,
        playerHealth: 50 - i * 10,
        enemyHealth: 30 - i * 5,
        outcome: i === 1 ? 'win' : 'loss'
      });
    }
    
    // Analyze all
    const replayIds = ['multi_0', 'multi_1', 'multi_2'];
    const results = analyzer.analyzeMultiple(replayIds);
    
    // Get stats
    const stats = analyzer.getStats(results);
    expect(stats.count).toBe(3);
    expect(stats.avgScore).toBeDefined();
  });

  test('opponent modeling from history', () => {
    // Create opponent history
    const history = [
      { opponentId: 'test_opp', quickVictory: true, avgDamagePerTurn: 15, turns: 8 },
      { opponentId: 'test_opp', quickVictory: true, avgDamagePerTurn: 12, turns: 10 }
    ];
    
    // Model opponent
    const model = opponentModel.modelOpponent(history);
    expect(model.style).toBe('aggressive');
    expect(model.deckType).toBe('aggro');
    expect(model.confidence).toBeGreaterThan(0.5);
  });

  test('deck analysis and matchup suggestion', () => {
    // Setup deck data
    mockStorage['metagame_deck_test_deck'] = JSON.stringify({
      playCount: 10,
      winCount: 6,
      avgDamage: 18,
      avgTurns: 10
    });
    
    // Analyze deck
    const analysis = deckAdvisor.analyzeDeck('test_deck');
    expect(analysis.strengths).toContain('高伤害输出');
    
    // Setup opponent deck
    mockStorage['metagame_deck_opp_deck'] = JSON.stringify({
      playCount: 8,
      winCount: 2,
      avgDamage: 8,
      avgTurns: 18
    });
    
    // Get matchup strategy
    const strategy = deckAdvisor.suggestMatchupStrategy('test_deck', 'opp_deck');
    expect(strategy.recommendation).toBeDefined();
    expect(strategy.matchupAdvantage).toBeDefined();
  });
});