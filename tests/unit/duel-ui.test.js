/**
 * Duel UI Tests
 * Tests DuelUI: room list display / duel interface / state sync
 */

const { DuelUI } = require('../../src/duel-ui.js');

describe('DuelUI', () => {
  let ui;

  beforeEach(() => {
    ui = new DuelUI();
  });

  describe('constructor', () => {
    test('initializes with default state', () => {
      expect(ui.state).toBeDefined();
      expect(ui.state.activeView).toBe('room_list');
      expect(ui.state.currentRoom).toBeNull();
    });

    test('initializes with container element', () => {
      const customUI = new DuelUI('duel-container');
      expect(customUI.container).toBe('duel-container');
    });
  });

  describe('renderRoomList', () => {
    test('renders room list HTML', () => {
      const rooms = [
        { id: 'room1', name: 'Room 1', hostId: 'player1', status: 'waiting' },
        { id: 'room2', name: 'Room 2', hostId: 'player2', status: 'waiting' }
      ];

      const html = ui.renderRoomList(rooms);

      expect(html).toContain('Room 1');
      expect(html).toContain('Room 2');
      expect(html).toContain('player1');
    });

    test('handles empty room list', () => {
      const html = ui.renderRoomList([]);

      expect(html).toContain('No rooms available');
    });
  });

  describe('renderDuelInterface', () => {
    test('renders duel interface', () => {
      const duelState = {
        player1Id: 'player1',
        player2Id: 'player2',
        player1Life: 100,
        player2Life: 100,
        currentTurn: 'player1'
      };

      const html = ui.renderDuelInterface(duelState);

      expect(html).toContain('player1');
      expect(html).toContain('player2');
      expect(html).toContain('100');
    });

    test('shows current turn indicator', () => {
      const duelState = {
        player1Id: 'player1',
        player2Id: 'player2',
        currentTurn: 'player2'
      };

      const html = ui.renderDuelInterface(duelState);

      expect(html).toContain('player2');
    });
  });

  describe('syncState', () => {
    test('updates internal state', () => {
      ui.syncState({ activeView: 'duel', currentRoom: 'room1' });

      expect(ui.state.activeView).toBe('duel');
      expect(ui.state.currentRoom).toBe('room1');
    });

    test('merges with existing state', () => {
      ui.state.someField = 'value';
      ui.syncState({ activeView: 'duel' });

      expect(ui.state.someField).toBe('value');
      expect(ui.state.activeView).toBe('duel');
    });
  });

  describe('renderWaitingRoom', () => {
    test('renders waiting room view', () => {
      const room = {
        id: 'room1',
        name: 'Test Room',
        hostId: 'player1',
        players: ['player1', 'player2']
      };

      const html = ui.renderWaitingRoom(room);

      expect(html).toContain('Test Room');
      expect(html).toContain('player1');
      expect(html).toContain('player2');
    });
  });

  describe('showNotification', () => {
    test('creates notification element', () => {
      const notification = ui.showNotification('Test message', 'info');

      expect(notification).toBeDefined();
      expect(notification.message).toBe('Test message');
      expect(notification.type).toBe('info');
    });

    test('handles different notification types', () => {
      const success = ui.showNotification('Success', 'success');
      const error = ui.showNotification('Error', 'error');

      expect(success.type).toBe('success');
      expect(error.type).toBe('error');
    });
  });

  describe('updateRoomStatus', () => {
    test('updates room status in state', () => {
      ui.state.currentRoom = { id: 'room1', status: 'waiting' };

      ui.updateRoomStatus('room1', 'matching');

      expect(ui.state.currentRoom.status).toBe('matching');
    });
  });

  describe('clearDuelInterface', () => {
    test('clears duel state', () => {
      ui.state.currentRoom = 'room1';
      ui.state.activeView = 'duel';

      ui.clearDuelInterface();

      expect(ui.state.currentRoom).toBeNull();
      expect(ui.state.activeView).toBe('room_list');
    });
  });

  describe('formatLifePoints', () => {
    test('formats life points display', () => {
      const formatted = ui.formatLifePoints(80);

      expect(formatted).toContain('80');
    });

    test('handles low life warning', () => {
      const lowLife = ui.formatLifePoints(20);

      expect(lowLife).toContain('20');
    });
  });

  describe('getState', () => {
    test('returns current state', () => {
      ui.state.activeView = 'duel';

      const state = ui.getState();

      expect(state.activeView).toBe('duel');
    });
  });
});