/**
 * Battle Replay Recorder Tests
 * Tests BattleReplayRecorder: record() / replay() / serialize()
 */

const mockStorage = {};
global.localStorage = {
  getItem: jest.fn((key) => mockStorage[key] || null),
  setItem: jest.fn((key, value) => { mockStorage[key] = value; }),
  removeItem: jest.fn((key) => { delete mockStorage[key]; }),
  clear: jest.fn(() => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }),
  get length() { return Object.keys(mockStorage).length; },
  key: jest.fn((i) => Object.keys(mockStorage)[i] || null)
};

const { BattleReplayRecorder } = require('../../src/battle-replay.js');

const clearMockStorage = () => {
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
};

describe('BattleReplayRecorder', () => {
  let recorder;

  beforeEach(() => {
    clearMockStorage();
    jest.clearAllMocks();
    recorder = new BattleReplayRecorder();
  });

  describe('constructor', () => {
    test('initializes with empty events array', () => {
      expect(recorder.events).toEqual([]);
      expect(recorder.currentBattleId).toBeNull();
    });

    test('initializes with options', () => {
      const options = { maxEvents: 500, compressionEnabled: true };
      const customRecorder = new BattleReplayRecorder(options);
      expect(customRecorder.maxEvents).toBe(500);
      expect(customRecorder.compressionEnabled).toBe(true);
    });
  });

  describe('record', () => {
    test('records a battle start event', () => {
      const battleId = recorder.record({
        type: 'battle_start',
        turn: 1,
        playerHP: 80,
        enemyHP: 50,
        playerEnergy: 3
      });

      expect(battleId).toBeDefined();
      expect(recorder.events.length).toBe(1);
      expect(recorder.currentBattleId).toBe(battleId);
    });

    test('records multiple events in sequence', () => {
      recorder.record({ type: 'battle_start', turn: 1, playerHP: 80, enemyHP: 50 });
      recorder.record({ type: 'card_played', turn: 1, cardId: 'strike', damage: 6 });
      recorder.record({ type: 'damage_dealt', turn: 1, damage: 6, target: 'enemy' });

      expect(recorder.events.length).toBe(3);
    });

    test('generates unique battle IDs', () => {
      const battleId1 = recorder.record({ type: 'battle_start', turn: 1 });
      const battleId2 = recorder.record({ type: 'battle_start', turn: 1 });

      expect(battleId1).not.toBe(battleId2);
    });

    test('enforces max events limit', () => {
      const limitedRecorder = new BattleReplayRecorder({ maxEvents: 3 });
      
      limitedRecorder.record({ type: 'event_1' });
      limitedRecorder.record({ type: 'event_2' });
      limitedRecorder.record({ type: 'event_3' });
      limitedRecorder.record({ type: 'event_4' });

      expect(limitedRecorder.events.length).toBe(3);
    });
  });

  describe('replay', () => {
    test('replays recorded events in order', () => {
      recorder.record({ type: 'battle_start', turn: 1, playerHP: 80 });
      recorder.record({ type: 'card_played', turn: 1, cardId: 'strike', damage: 6 });
      recorder.record({ type: 'battle_end', turn: 5, victory: true });

      const replay = recorder.replay();
      
      expect(replay.events.length).toBe(3);
      expect(replay.events[0].type).toBe('battle_start');
      expect(replay.events[1].type).toBe('card_played');
      expect(replay.events[2].type).toBe('battle_end');
    });

    test('returns empty replay when no events', () => {
      const replay = recorder.replay();
      
      expect(replay.events).toEqual([]);
      expect(replay.duration).toBe(0);
    });

    test('calculates duration from timestamps', () => {
      recorder.record({ type: 'battle_start', turn: 1, timestamp: 1000 });
      recorder.record({ type: 'battle_end', turn: 5, timestamp: 5000 });

      const replay = recorder.replay();
      
      expect(replay.duration).toBe(4000);
    });

    test('replays from specific battle ID', () => {
      const battleId1 = recorder.record({ type: 'battle_start', turn: 1 });
      recorder.record({ type: 'event_A' });
      const battleId2 = recorder.record({ type: 'battle_start', turn: 1 });
      recorder.record({ type: 'event_B' });

      const replay = recorder.replay(battleId2);
      
      expect(replay.events.length).toBe(2);
      expect(replay.events[0].type).toBe('battle_start');
      expect(replay.events[1].type).toBe('event_B');
    });
  });

  describe('serialize', () => {
    test('serializes events to JSON', () => {
      recorder.record({ type: 'battle_start', turn: 1, playerHP: 80 });
      recorder.record({ type: 'card_played', turn: 1, cardId: 'strike' });

      const serialized = recorder.serialize();

      expect(typeof serialized).toBe('string');
      const parsed = JSON.parse(serialized);
      expect(parsed.events.length).toBe(2);
    });

    test('returns empty JSON when no events', () => {
      const serialized = recorder.serialize();
      const parsed = JSON.parse(serialized);
      
      expect(parsed.events).toEqual([]);
    });

    test('includes metadata in serialized output', () => {
      recorder.record({ type: 'battle_start', turn: 1 });

      const serialized = recorder.serialize();
      const parsed = JSON.parse(serialized);

      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.version).toBeDefined();
    });

    test('compresses when compression enabled', () => {
      const compressor = new BattleReplayRecorder({ compressionEnabled: true });
      compressor.record({ type: 'battle_start', turn: 1, playerHP: 80 });
      compressor.record({ type: 'battle_start', turn: 1, playerHP: 80 });

      const serialized = compressor.serialize();
      const parsed = JSON.parse(serialized);
      
      expect(parsed.events.length).toBe(2);
    });
  });

  describe('deserialize', () => {
    test('deserializes JSON to events', () => {
      recorder.record({ type: 'battle_start', turn: 1, playerHP: 80 });
      const serialized = recorder.serialize();

      const newRecorder = new BattleReplayRecorder();
      const result = newRecorder.deserialize(serialized);

      expect(result.eventCount).toBe(1);
      expect(newRecorder.events.length).toBe(1);
      expect(newRecorder.events[0].playerHP).toBe(80);
    });

    test('returns false for invalid JSON', () => {
      const result = recorder.deserialize('invalid json');
      expect(result).toBe(false);
    });

    test('returns false for null input', () => {
      const result = recorder.deserialize(null);
      expect(result).toBe(false);
    });
  });

  describe('reset', () => {
    test('clears all events', () => {
      recorder.record({ type: 'battle_start', turn: 1 });
      recorder.record({ type: 'card_played', turn: 1 });

      recorder.reset();

      expect(recorder.events).toEqual([]);
      expect(recorder.currentBattleId).toBeNull();
    });
  });

  describe('getEventCount', () => {
    test('returns correct event count', () => {
      expect(recorder.getEventCount()).toBe(0);
      
      recorder.record({ type: 'event_1' });
      recorder.record({ type: 'event_2' });
      
      expect(recorder.getEventCount()).toBe(2);
    });
  });

  describe('getKeyEvents', () => {
    test('filters key events', () => {
      recorder.record({ type: 'battle_start', turn: 1 });
      recorder.record({ type: 'card_played', turn: 1 });
      recorder.record({ type: 'critical_hit', turn: 3 });
      recorder.record({ type: 'battle_end', turn: 5 });

      const keyEvents = recorder.getKeyEvents();
      
      expect(keyEvents.length).toBe(3);
      expect(keyEvents[0].type).toBe('battle_start');
      expect(keyEvents[1].type).toBe('critical_hit');
      expect(keyEvents[2].type).toBe('battle_end');
    });
  });
});