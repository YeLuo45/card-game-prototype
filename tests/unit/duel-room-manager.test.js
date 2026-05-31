/**
 * Duel Room Manager Tests
 * Tests DuelRoomManager: createRoom() / joinRoom() / room states
 */

const { DuelRoomManager } = require('../../src/duel-room-manager.js');

describe('DuelRoomManager', () => {
  let manager;

  beforeEach(() => {
    manager = new DuelRoomManager();
  });

  describe('constructor', () => {
    test('initializes with empty rooms', () => {
      expect(manager.rooms).toBeDefined();
      expect(manager.rooms.size).toBe(0);
    });

    test('initializes with options', () => {
      const customManager = new DuelRoomManager({ maxRooms: 50 });
      expect(customManager.maxRooms).toBe(50);
    });
  });

  describe('createRoom', () => {
    test('creates a new room with unique ID', () => {
      const room = manager.createRoom({ hostId: 'player1', name: 'Test Room' });
      
      expect(room).toBeDefined();
      expect(room.id).toBeDefined();
      expect(room.hostId).toBe('player1');
      expect(room.name).toBe('Test Room');
      expect(room.status).toBe('waiting');
    });

    test('generates unique room IDs', () => {
      const room1 = manager.createRoom({ hostId: 'player1' });
      const room2 = manager.createRoom({ hostId: 'player2' });

      expect(room1.id).not.toBe(room2.id);
    });

    test('adds room to rooms map', () => {
      const room = manager.createRoom({ hostId: 'player1' });
      
      expect(manager.rooms.has(room.id)).toBe(true);
      expect(manager.rooms.get(room.id)).toBe(room);
    });
  });

  describe('joinRoom', () => {
    test('joins an existing room', () => {
      const room = manager.createRoom({ hostId: 'player1' });
      const result = manager.joinRoom(room.id, { playerId: 'player2' });

      expect(result).toBe(true);
      expect(room.players).toContain('player2');
      expect(room.status).toBe('matching');
    });

    test('fails for non-existent room', () => {
      const result = manager.joinRoom('invalid-id', { playerId: 'player2' });
      
      expect(result).toBe(false);
    });

    test('prevents duplicate player joins', () => {
      const room = manager.createRoom({ hostId: 'player1' });
      manager.joinRoom(room.id, { playerId: 'player1' });

      expect(room.players.length).toBe(1);
    });
  });

  describe('leaveRoom', () => {
    test('removes player from room', () => {
      const room = manager.createRoom({ hostId: 'player1' });
      manager.joinRoom(room.id, { playerId: 'player2' });
      
      manager.leaveRoom(room.id, 'player2');

      expect(room.players).not.toContain('player2');
      expect(room.status).toBe('waiting');
    });

    test('deletes room when host leaves', () => {
      const room = manager.createRoom({ hostId: 'player1' });
      
      manager.leaveRoom(room.id, 'player1');

      expect(manager.rooms.has(room.id)).toBe(false);
    });
  });

  describe('room status management', () => {
    test('updates room status', () => {
      const room = manager.createRoom({ hostId: 'player1' });
      
      room.status = 'matching';
      
      expect(room.status).toBe('matching');
    });

    test('transitions to in_progress when match starts', () => {
      const room = manager.createRoom({ hostId: 'player1' });
      manager.joinRoom(room.id, { playerId: 'player2' });
      
      room.status = 'in_progress';

      expect(room.status).toBe('in_progress');
      expect(room.startedAt).toBeDefined();
    });

    test('transitions to ended when duel concludes', () => {
      const room = manager.createRoom({ hostId: 'player1' });
      manager.joinRoom(room.id, { playerId: 'player2' });
      room.status = 'in_progress';
      
      room.status = 'ended';

      expect(room.status).toBe('ended');
      expect(room.endedAt).toBeDefined();
    });
  });

  describe('player ready status', () => {
    test('sets player ready status', () => {
      const room = manager.createRoom({ hostId: 'player1' });
      manager.joinRoom(room.id, { playerId: 'player2' });
      
      room.setReady('player1', true);

      expect(room.readyStatus['player1']).toBe(true);
    });

    test('checks if all players ready', () => {
      const room = manager.createRoom({ hostId: 'player1' });
      manager.joinRoom(room.id, { playerId: 'player2' });
      
      room.setReady('player1', true);
      room.setReady('player2', true);

      expect(room.areAllReady()).toBe(true);
    });
  });

  describe('getRoom', () => {
    test('returns room by ID', () => {
      const room = manager.createRoom({ hostId: 'player1' });
      
      const found = manager.getRoom(room.id);

      expect(found).toBe(room);
    });

    test('returns null for non-existent room', () => {
      const found = manager.getRoom('invalid-id');
      
      expect(found).toBeNull();
    });
  });

  describe('listAvailableRooms', () => {
    test('returns waiting rooms', () => {
      const room1 = manager.createRoom({ hostId: 'player1', name: 'Room 1' });
      const room2 = manager.createRoom({ hostId: 'player2', name: 'Room 2' });
      manager.createRoom({ hostId: 'player3', name: 'Room 3' });

      room1.status = 'in_progress';

      const available = manager.listAvailableRooms();

      expect(available.length).toBe(2);
    });
  });

  describe('deleteRoom', () => {
    test('deletes room by ID', () => {
      const room = manager.createRoom({ hostId: 'player1' });
      
      manager.deleteRoom(room.id);

      expect(manager.rooms.has(room.id)).toBe(false);
    });
  });
});