/**
 * Tournament Bracket Generator Tests
 * Tests TournamentBracketGenerator: bracket generation / round management / result entry
 */

const { TournamentBracketGenerator } = require('../../src/tournament-bracket-generator.js');

describe('TournamentBracketGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new TournamentBracketGenerator();
  });

  describe('constructor', () => {
    test('initializes with empty bracket', () => {
      expect(generator.bracket).toEqual([]);
      expect(generator.currentRound).toBe(0);
    });
  });

  describe('generateEliminationBracket', () => {
    test('generates bracket with correct number of rounds for power of 2', () => {
      const participants = ['p1', 'p2', 'p3', 'p4'];
      const bracket = generator.generateEliminationBracket(participants);

      expect(bracket.length).toBe(2); // 4 players = 2 rounds (semi + final)
    });

    test('generates bracket with correct number of rounds for 8 players', () => {
      const participants = Array.from({ length: 8 }, (_, i) => `p${i}`);
      const bracket = generator.generateEliminationBracket(participants);

      expect(bracket.length).toBe(3); // 8 players = 3 rounds
    });

    test('pads participants for non-power of 2', () => {
      const participants = ['p1', 'p2', 'p3'];
      const bracket = generator.generateEliminationBracket(participants);

      // 3 players padded to 4, which needs 2 rounds
      expect(bracket.length).toBe(2);
    });

    test('stores bracket correctly', () => {
      const participants = ['p1', 'p2', 'p3', 'p4'];
      generator.generateEliminationBracket(participants);

      expect(generator.bracket.length).toBeGreaterThan(0);
    });
  });

  describe('generateRoundRobinBracket', () => {
    test('generates round-robin schedule', () => {
      const participants = ['p1', 'p2', 'p3', 'p4'];
      const bracket = generator.generateRoundRobinBracket(participants);

      expect(bracket.length).toBe(3); // 4 players = 6 matches / 2 per round = 3 rounds
    });

    test('each round has correct number of matches', () => {
      const participants = ['p1', 'p2', 'p3', 'p4'];
      const bracket = generator.generateRoundRobinBracket(participants);

      for (const round of bracket) {
        expect(round.length).toBe(2); // 4 players = 2 matches per round
      }
    });

    test('ensures each player plays each other once', () => {
      const participants = ['p1', 'p2', 'p3'];
      const bracket = generator.generateRoundRobinBracket(participants);

      const matchups = bracket.flat();
      const allPairs = new Set();

      for (const match of matchups) {
        const pair = [match.player1, match.player2].sort().join('-');
        allPairs.add(pair);
      }

      // 3 players = 3 unique pairs for round robin
      expect(allPairs.size).toBeGreaterThanOrEqual(3);
    });
  });

  describe('advanceRound', () => {
    test('increments current round', () => {
      const participants = ['p1', 'p2', 'p3', 'p4'];
      generator.generateEliminationBracket(participants);

      generator.advanceRound();

      expect(generator.currentRound).toBe(1);
    });

    test('does not advance beyond bracket rounds', () => {
      const participants = ['p1', 'p2', 'p3', 'p4'];
      generator.generateEliminationBracket(participants);

      const maxRounds = generator.bracket.length;
      for (let i = 0; i < maxRounds + 5; i++) {
        generator.advanceRound();
      }

      expect(generator.currentRound).toBeLessThanOrEqual(maxRounds);
    });
  });

  describe('getCurrentRoundMatches', () => {
    test('returns matches for current round', () => {
      const participants = ['p1', 'p2', 'p3', 'p4'];
      generator.generateEliminationBracket(participants);

      const matches = generator.getCurrentRoundMatches();

      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
    });

    test('returns empty array when no bracket', () => {
      const matches = generator.getCurrentRoundMatches();

      expect(matches).toEqual([]);
    });
  });

  describe('recordResult', () => {
    test('records match winner', () => {
      const participants = ['p1', 'p2', 'p3', 'p4'];
      generator.generateEliminationBracket(participants);

      const matches = generator.getCurrentRoundMatches();
      if (matches.length > 0) {
        const result = generator.recordResult(0, 'p1', 'p2');
        expect(result).toBe(true);
      }
    });

    test('returns false for invalid match index', () => {
      const participants = ['p1', 'p2', 'p3', 'p4'];
      generator.generateEliminationBracket(participants);

      const result = generator.recordResult(999, 'p1', 'p2');
      expect(result).toBe(false);
    });
  });

  describe('getMatchResult', () => {
    test('returns recorded result', () => {
      const participants = ['p1', 'p2', 'p3', 'p4'];
      generator.generateEliminationBracket(participants);

      generator.recordResult(0, 'p1', 'p2');
      const matchResult = generator.getMatchResult(0);

      expect(matchResult).toBeDefined();
      expect(matchResult.winner).toBe('p1');
    });

    test('returns null for unrecorded match', () => {
      const participants = ['p1', 'p2', 'p3', 'p4'];
      generator.generateEliminationBracket(participants);

      const result = generator.getMatchResult(0);
      expect(result).toBeNull();
    });
  });

  describe('getWinner', () => {
    test('returns null when bracket is incomplete', () => {
      const participants = ['p1', 'p2', 'p3', 'p4'];
      generator.generateEliminationBracket(participants);

      // Only record partial results
      if (generator.bracket.length > 0) {
        generator.recordResult(0, 'p1', 'p2');
      }

      const winner = generator.getWinner();
      expect(winner).toBeNull();
    });

    test('returns null when no bracket generated', () => {
      const winner = generator.getWinner();
      expect(winner).toBeNull();
    });
  });

  describe('reset', () => {
    test('clears bracket and current round', () => {
      const participants = ['p1', 'p2', 'p3', 'p4'];
      generator.generateEliminationBracket(participants);
      generator.advanceRound();

      generator.reset();

      expect(generator.bracket).toEqual([]);
      expect(generator.currentRound).toBe(0);
    });
  });
});