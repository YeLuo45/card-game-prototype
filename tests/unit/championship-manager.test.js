/**
 * Championship Manager Tests
 * Tests ChampionshipManager: tournament scheduling / qualification / bonus points
 */

const { ChampionshipManager } = require('../../src/championship-manager.js');

describe('ChampionshipManager', () => {
  let manager;

  beforeEach(() => {
    manager = new ChampionshipManager();
  });

  describe('constructor', () => {
    test('initializes with empty tournaments', () => {
      expect(manager.tournaments).toEqual([]);
      expect(manager.currentTournament).toBeNull();
    });

    test('initializes with custom options', () => {
      const customManager = new ChampionshipManager({ seasonId: 'season_9' });
      expect(customManager.seasonId).toBe('season_9');
    });
  });

  describe('createTournament', () => {
    test('creates a new tournament', () => {
      const tournament = manager.createTournament({
        name: 'Championship Cup',
        type: 'elimination',
        maxParticipants: 16
      });

      expect(tournament).toBeDefined();
      expect(tournament.name).toBe('Championship Cup');
      expect(tournament.type).toBe('elimination');
      expect(tournament.status).toBe('pending');
    });

    test('generates unique tournament ID', () => {
      const t1 = manager.createTournament({ name: 'T1' });
      const t2 = manager.createTournament({ name: 'T2' });

      expect(t1.id).not.toBe(t2.id);
    });

    test('sets default max participants', () => {
      const tournament = manager.createTournament({ name: 'Test' });
      expect(tournament.maxParticipants).toBe(8);
    });
  });

  describe('registerParticipant', () => {
    test('registers a player to tournament', () => {
      const tournament = manager.createTournament({ name: 'Test Cup' });
      const result = manager.registerParticipant(tournament.id, 'player1', 'Alice');

      expect(result).toBe(true);
      expect(manager.getParticipantCount(tournament.id)).toBe(1);
    });

    test('prevents duplicate registration', () => {
      const tournament = manager.createTournament({ name: 'Test Cup' });
      manager.registerParticipant(tournament.id, 'player1', 'Alice');
      const result = manager.registerParticipant(tournament.id, 'player1', 'Alice');

      expect(result).toBe(false);
      expect(manager.getParticipantCount(tournament.id)).toBe(1);
    });

    test('enforces max participants limit', () => {
      const tournament = manager.createTournament({ name: 'Small Cup', maxParticipants: 2 });
      manager.registerParticipant(tournament.id, 'player1', 'Alice');
      manager.registerParticipant(tournament.id, 'player2', 'Bob');
      const result = manager.registerParticipant(tournament.id, 'player3', 'Carol');

      expect(result).toBe(false);
    });
  });

  describe('validateQualification', () => {
    test('returns true for registered player', () => {
      const tournament = manager.createTournament({ name: 'Test' });
      manager.registerParticipant(tournament.id, 'player1', 'Alice');

      expect(manager.validateQualification(tournament.id, 'player1')).toBe(true);
    });

    test('returns false for non-registered player', () => {
      const tournament = manager.createTournament({ name: 'Test' });

      expect(manager.validateQualification(tournament.id, 'player1')).toBe(false);
    });

    test('returns true for registered player when tournament is active (registration before start)', () => {
      const tournament = manager.createTournament({ name: 'Test' });
      manager.registerParticipant(tournament.id, 'player1', 'Alice');
      manager.startTournament(tournament.id);

      // Player was registered before tournament started
      expect(manager.validateQualification(tournament.id, 'player1')).toBe(true);
    });
  });

  describe('startTournament', () => {
    test('changes tournament status to active', () => {
      const tournament = manager.createTournament({ name: 'Test', minParticipants: 1 });
      manager.registerParticipant(tournament.id, 'player1', 'Alice');

      const result = manager.startTournament(tournament.id);

      expect(result).toBe(true);
      expect(manager.getTournamentStatus(tournament.id)).toBe('active');
    });

    test('prevents starting with insufficient participants', () => {
      const tournament = manager.createTournament({ name: 'Test', minParticipants: 4 });
      manager.registerParticipant(tournament.id, 'player1', 'Alice');

      const result = manager.startTournament(tournament.id);

      expect(result).toBe(false);
      expect(manager.getTournamentStatus(tournament.id)).toBe('pending');
    });
  });

  describe('calculateBonusPoints', () => {
    test('calculates winner bonus correctly', () => {
      const tournament = manager.createTournament({ name: 'Test' });
      const points = manager.calculateBonusPoints(tournament.id, 1);

      expect(points).toBe(1000);
    });

    test('calculates runner-up bonus correctly', () => {
      const tournament = manager.createTournament({ name: 'Test' });
      const points = manager.calculateBonusPoints(tournament.id, 2);

      expect(points).toBe(500);
      expect(points).toBeLessThan(manager.calculateBonusPoints(tournament.id, 1));
    });

    test('returns 0 for placement beyond rewards', () => {
      const tournament = manager.createTournament({ name: 'Test' });
      const points = manager.calculateBonusPoints(tournament.id, 10);

      expect(points).toBe(0);
    });

    test('returns participation bonus for placement 8', () => {
      const tournament = manager.createTournament({ name: 'Test' });
      const points = manager.calculateBonusPoints(tournament.id, 8);

      expect(points).toBe(10);
    });
  });

  describe('getTournament', () => {
    test('returns tournament by ID', () => {
      const tournament = manager.createTournament({ name: 'Test Cup' });
      const found = manager.getTournament(tournament.id);

      expect(found).toBeDefined();
      expect(found.name).toBe('Test Cup');
    });

    test('returns null for invalid ID', () => {
      const found = manager.getTournament('invalid-id');
      expect(found).toBeNull();
    });
  });

  describe('getParticipants', () => {
    test('returns all participants', () => {
      const tournament = manager.createTournament({ name: 'Test' });
      manager.registerParticipant(tournament.id, 'player1', 'Alice');
      manager.registerParticipant(tournament.id, 'player2', 'Bob');

      const participants = manager.getParticipants(tournament.id);

      expect(participants.length).toBe(2);
    });
  });

  describe('completeTournament', () => {
    test('sets tournament status to completed', () => {
      const tournament = manager.createTournament({ name: 'Test' });
      manager.registerParticipant(tournament.id, 'player1', 'Alice');
      manager.startTournament(tournament.id);

      manager.completeTournament(tournament.id);

      expect(manager.getTournamentStatus(tournament.id)).toBe('completed');
    });
  });
});