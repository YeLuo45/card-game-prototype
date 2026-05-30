/**
 * Season Tournament Expansion Tests
 * Tests for TournamentBracket, ELORating, SeasonTournament
 */

// 模拟localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value; }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: jest.fn((i) => Object.keys(store)[i]),
    _reset: () => { store = {}; }
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

const { TournamentBracket, ELORating, SeasonTournament, SeasonTournamentWithSeasonManager } = require('../../season-tournament.js');

describe('TournamentBracket', () => {
  let bracket;

  beforeEach(() => {
    bracket = new TournamentBracket();
    localStorageMock._reset();
  });

  describe('createBracket', () => {
    test('should create a bracket with valid players', () => {
      const players = [
        { id: 'p1', name: 'Player 1', seed: 1 },
        { id: 'p2', name: 'Player 2', seed: 2 },
        { id: 'p3', name: 'Player 3', seed: 3 },
        { id: 'p4', name: 'Player 4', seed: 4 }
      ];
      const result = bracket.createBracket('t1', players);
      
      expect(result).not.toBeNull();
      expect(result.id).toBe('t1');
      expect(result.type).toBe('single_elimination');
      expect(result.status).toBe('created');
      expect(result.players).toHaveLength(4);
      expect(result.rounds).toHaveLength(2); // 4 players = 2 rounds
    });

    test('should return null for invalid input', () => {
      expect(bracket.createBracket(null, [])).toBeNull();
      expect(bracket.createBracket('t1', [])).toBeNull();
      expect(bracket.createBracket('t1', [{ id: 'p1' }])).toBeNull();
    });

    test('should pad players to power of 2', () => {
      const players = [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' },
        { id: 'p3', name: 'Player 3' }
      ];
      const result = bracket.createBracket('t1', players);
      
      expect(result.players).toHaveLength(4); // padded to 4
      expect(result.players.some(p => p.isBye)).toBe(true);
    });

    test('should create correct number of rounds', () => {
      const players8 = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
      const result8 = bracket.createBracket('t8', players8);
      expect(result8.rounds).toHaveLength(3); // 8 players = 3 rounds

      const players16 = Array.from({ length: 16 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
      const result16 = bracket.createBracket('t16', players16);
      expect(result16.rounds).toHaveLength(4); // 16 players = 4 rounds
    });
  });

  describe('getBracket', () => {
    test('should return created bracket', () => {
      const players = [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' }
      ];
      bracket.createBracket('t1', players);
      const result = bracket.getBracket('t1');
      
      expect(result).not.toBeNull();
      expect(result.id).toBe('t1');
    });

    test('should return null for non-existent bracket', () => {
      expect(bracket.getBracket('nonexistent')).toBeNull();
    });
  });

  describe('getMatches', () => {
    test('should return empty array for non-existent tournament', () => {
      expect(bracket.getMatches('nonexistent')).toEqual([]);
    });

    test('should return all matches for tournament', () => {
      const players = [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' },
        { id: 'p3', name: 'Player 3' },
        { id: 'p4', name: 'Player 4' }
      ];
      bracket.createBracket('t1', players);
      const matches = bracket.getMatches('t1');
      
      expect(matches).toHaveLength(3); // 4 players = 3 matches total
    });
  });

  describe('getMatchesByRound', () => {
    test('should return empty array for non-existent tournament', () => {
      expect(bracket.getMatchesByRound('nonexistent', 1)).toEqual([]);
    });

    test('should return matches for specific round', () => {
      const players = [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' },
        { id: 'p3', name: 'Player 3' },
        { id: 'p4', name: 'Player 4' }
      ];
      bracket.createBracket('t1', players);
      const round1Matches = bracket.getMatchesByRound('t1', 1);
      
      expect(round1Matches).toHaveLength(2); // First round has 2 matches for 4 players
    });
  });

  describe('simulateMatch', () => {
    test('should simulate match and determine winner', () => {
      const players = [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' }
      ];
      bracket.createBracket('t1', players);
      const match = bracket.getMatches('t1')[0];
      
      const result = bracket.simulateMatch('t1', match.id, { randomSeed: 12345 });
      
      expect(result).not.toBeNull();
      expect(result.matchId).toBe(match.id);
      expect(result.winner).toBeTruthy();
      expect(result.loser).toBeTruthy();
      expect(result.winner).not.toBe(result.loser);
    });

    test('should allow explicit winner specification', () => {
      const players = [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' }
      ];
      bracket.createBracket('t1', players);
      const match = bracket.getMatches('t1')[0];
      
      const result = bracket.simulateMatch('t1', match.id, { winnerId: 'p1' });
      
      expect(result.winner).toBe('p1');
    });

    test('should return null for invalid match', () => {
      expect(bracket.simulateMatch('t1', 'invalid', {})).toBeNull();
      expect(bracket.simulateMatch('nonexistent', 'M1', {})).toBeNull();
    });

    test('should mark match as completed', () => {
      const players = [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' }
      ];
      bracket.createBracket('t1', players);
      const match = bracket.getMatches('t1')[0];
      bracket.simulateMatch('t1', match.id, { winnerId: 'p1' });
      
      const updatedMatch = bracket.getMatches('t1')[0];
      expect(updatedMatch.status).toBe('completed');
      expect(updatedMatch.winner.id).toBe('p1');
    });

    test('should return null when match already completed', () => {
      const players = [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' }
      ];
      bracket.createBracket('t1', players);
      const match = bracket.getMatches('t1')[0];
      bracket.simulateMatch('t1', match.id, { winnerId: 'p1' });
      
      // Try to simulate again
      const result = bracket.simulateMatch('t1', match.id, { winnerId: 'p2' });
      expect(result).toBeNull();
    });
  });

  describe('advanceWinners', () => {
    test('should advance winner to next round', () => {
      const players = [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' },
        { id: 'p3', name: 'Player 3' },
        { id: 'p4', name: 'Player 4' }
      ];
      bracket.createBracket('t1', players);
      
      // Simulate first round matches
      const round1Matches = bracket.getMatchesByRound('t1', 1);
      for (const match of round1Matches) {
        bracket.simulateMatch('t1', match.id, { winnerId: match.player1.id });
      }
      
      // Check second round has players
      const round2Matches = bracket.getMatchesByRound('t1', 2);
      expect(round2Matches[0].player1).not.toBeNull();
    });
  });

  describe('getChampion', () => {
    test('should return champion after tournament completion', () => {
      const players = [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' }
      ];
      bracket.createBracket('t1', players);
      const match = bracket.getMatches('t1')[0];
      bracket.simulateMatch('t1', match.id, { winnerId: 'p1' });
      
      const champion = bracket.getChampion('t1');
      expect(champion).not.toBeNull();
      expect(champion.id).toBe('p1');
    });

    test('should return null for non-existent tournament', () => {
      expect(bracket.getChampion('nonexistent')).toBeNull();
    });
  });

  describe('getCurrentRound', () => {
    test('should return current round number', () => {
      const players = [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' },
        { id: 'p3', name: 'Player 3' },
        { id: 'p4', name: 'Player 4' }
      ];
      bracket.createBracket('t1', players);
      
      const currentRound = bracket.getCurrentRound('t1');
      expect(currentRound).toBeGreaterThanOrEqual(1);
    });
  });

  describe('deleteBracket', () => {
    test('should delete bracket', () => {
      const players = [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' }
      ];
      bracket.createBracket('t1', players);
      bracket.deleteBracket('t1');
      
      expect(bracket.getBracket('t1')).toBeNull();
    });
  });
});

describe('ELORating', () => {
  let eloRating;

  beforeEach(() => {
    eloRating = new ELORating();
    localStorageMock._reset();
  });

  describe('calculateNewRating', () => {
    test('should calculate new rating after win', () => {
      const result = eloRating.calculateNewRating('p1', 'p2', 'win');
      
      expect(result).not.toBeNull();
      expect(result.playerId).toBe('p1');
      expect(result.previousRating).toBe(1500); // default
      expect(result.newRating).toBeGreaterThan(1500); // win increases rating
      expect(result.ratingChange).toBeGreaterThan(0);
      expect(result.result).toBe('win');
    });

    test('should calculate new rating after loss', () => {
      const result = eloRating.calculateNewRating('p1', 'p2', 'loss');
      
      expect(result).not.toBeNull();
      expect(result.newRating).toBeLessThan(1500); // loss decreases rating
      expect(result.ratingChange).toBeLessThan(0);
      expect(result.result).toBe('loss');
    });

    test('should calculate new rating after draw', () => {
      const result = eloRating.calculateNewRating('p1', 'p2', 'draw');
      
      expect(result).not.toBeNull();
      // Draw rating change should be minimal
      expect(Math.abs(result.ratingChange)).toBeLessThanOrEqual(16);
      expect(result.result).toBe('draw');
    });

    test('should return null for invalid input', () => {
      expect(eloRating.calculateNewRating(null, 'p2', 'win')).toBeNull();
      expect(eloRating.calculateNewRating('p1', null, 'win')).toBeNull();
      expect(eloRating.calculateNewRating('p1', 'p2', null)).toBeNull();
      expect(eloRating.calculateNewRating('p1', 'p2', 'invalid')).toBeNull();
    });

    test('should consider opponent rating', () => {
      // Set opponent rating high
      eloRating.setPlayerRating('strong', 2000);
      const result = eloRating.calculateNewRating('weak', 'strong', 'win');
      
      // Winning against a strong opponent should give more points
      expect(result.ratingChange).toBeGreaterThan(16);
    });
  });

  describe('calculateBatchRatings', () => {
    test('should calculate ratings for multiple matches', () => {
      const matches = [
        { winnerId: 'p1', loserId: 'p2' },
        { winnerId: 'p3', loserId: 'p4' }
      ];
      
      const results = eloRating.calculateBatchRatings(matches);
      
      expect(results).toHaveLength(2);
      expect(results[0].result).toBe('win');
      expect(results[1].result).toBe('win');
    });
  });

  describe('getPlayerRating', () => {
    test('should return default rating for new player', () => {
      const rating = eloRating.getPlayerRating('newplayer');
      expect(rating).toBe(1500);
    });

    test('should return stored rating', () => {
      eloRating.setPlayerRating('p1', 1800);
      const rating = eloRating.getPlayerRating('p1');
      expect(rating).toBe(1800);
    });

    test('should return default for null playerId', () => {
      expect(eloRating.getPlayerRating(null)).toBe(1500);
    });

    test('should handle localStorage getItem throwing', () => {
      // Temporarily replace getItem with a throwing version
      const originalGetItem = localStorageMock.getItem;
      const tempGetItem = jest.fn(() => {
        throw new Error('Storage error');
      });
      localStorageMock.getItem = tempGetItem;
      
      const rating = eloRating.getPlayerRating('errorplayer');
      expect(rating).toBe(1500); // Should return default
      
      // Restore
      localStorageMock.getItem = originalGetItem;
    });
  });

  describe('setPlayerRating', () => {
    test('should set player rating', () => {
      const result = eloRating.setPlayerRating('p1', 1700);
      expect(result).toBe(true);
      expect(eloRating.getPlayerRating('p1')).toBe(1700);
    });

    test('should not set rating for null playerId', () => {
      expect(eloRating.setPlayerRating(null, 1700)).toBe(false);
    });

    test('should enforce minimum rating of 100', () => {
      eloRating.setPlayerRating('p_min', 50);
      expect(eloRating.getPlayerRating('p_min')).toBe(100);
    });
  });

  describe('getTopPlayers', () => {
    test('should return empty list initially', () => {
      const top = eloRating.getTopPlayers();
      expect(top).toEqual([]);
    });

    test('should return sorted players', () => {
      eloRating.setPlayerRating('p1', 1600);
      eloRating.setPlayerRating('p2', 1700);
      eloRating.setPlayerRating('p3', 1500);
      
      const top = eloRating.getTopPlayers(10);
      
      expect(top).toHaveLength(3);
      expect(top[0].playerId).toBe('p2'); // highest
      expect(top[0].rating).toBe(1700);
      expect(top[1].playerId).toBe('p1');
      expect(top[2].playerId).toBe('p3'); // lowest
    });

    test('should respect limit', () => {
      eloRating.setPlayerRating('p1', 1600);
      eloRating.setPlayerRating('p2', 1700);
      eloRating.setPlayerRating('p3', 1500);
      
      const top = eloRating.getTopPlayers(2);
      
      expect(top).toHaveLength(2);
      expect(top[0].rank).toBe(1);
      expect(top[1].rank).toBe(2);
    });
  });

  describe('getPlayerRank', () => {
    test('should return correct rank', () => {
      eloRating.setPlayerRating('p1', 1600);
      eloRating.setPlayerRating('p2', 1700);
      eloRating.setPlayerRating('p3', 1500);
      
      expect(eloRating.getPlayerRank('p2')).toBe(1);
      expect(eloRating.getPlayerRank('p1')).toBe(2);
      expect(eloRating.getPlayerRank('p3')).toBe(3);
    });

    test('should return -1 for unknown player', () => {
      expect(eloRating.getPlayerRank('unknown')).toBe(-1);
    });
  });

  describe('resetPlayerRating', () => {
    test('should reset single player rating', () => {
      eloRating.setPlayerRating('p1', 1800);
      eloRating.resetPlayerRating('p1');
      
      expect(eloRating.getPlayerRating('p1')).toBe(1500);
    });
  });

  describe('resetAllRatings', () => {
    test('should reset all ratings', () => {
      eloRating.setPlayerRating('p1', 1800);
      eloRating.setPlayerRating('p2', 1900);
      eloRating.resetAllRatings();
      
      expect(eloRating.getPlayerRating('p1')).toBe(1500);
      expect(eloRating.getPlayerRating('p2')).toBe(1500);
    });
  });
});

describe('SeasonTournament', () => {
  let seasonTournament;
  let mockSeasonManager;

  beforeEach(() => {
    mockSeasonManager = {
      getCurrentSeason: jest.fn(() => ({
        id: 'S1',
        status: 'active'
      })),
      getSeasonStats: jest.fn(() => null)
    };
    seasonTournament = new SeasonTournament(mockSeasonManager);
    localStorageMock._reset();
  });

  describe('registerForTournament', () => {
    test('should register player for tournament', () => {
      const result = seasonTournament.registerForTournament('t1', 'p1', { name: 'Player 1' });
      expect(result).toBe(true);
    });

    test('should not register same player twice', () => {
      seasonTournament.registerForTournament('t1', 'p1');
      const result = seasonTournament.registerForTournament('t1', 'p1');
      expect(result).toBe(false);
    });

    test('should return false for invalid input', () => {
      expect(seasonTournament.registerForTournament(null, 'p1')).toBe(false);
      expect(seasonTournament.registerForTournament('t1', null)).toBe(false);
    });
  });

  describe('getRegisteredPlayers', () => {
    test('should return registered players', () => {
      seasonTournament.registerForTournament('t1', 'p1', { name: 'Player 1' });
      seasonTournament.registerForTournament('t1', 'p2', { name: 'Player 2' });
      
      const players = seasonTournament.getRegisteredPlayers('t1');
      expect(players).toHaveLength(2);
    });

    test('should return empty for non-existent tournament', () => {
      const players = seasonTournament.getRegisteredPlayers('nonexistent');
      expect(players).toEqual([]);
    });
  });

  describe('startTournament', () => {
    test('should return null with insufficient players', () => {
      seasonTournament.registerForTournament('t1', 'p1', { name: 'Player 1' });
      
      const bracket = seasonTournament.startTournament('t1');
      expect(bracket).toBeNull();
    });

    test('should return null for invalid tournamentId', () => {
      const bracket = seasonTournament.startTournament(null);
      expect(bracket).toBeNull();
    });

    test('should return null for tournament with no registered players', () => {
      const bracket = seasonTournament.startTournament('nonexistent');
      expect(bracket).toBeNull();
    });
  });

  describe('recordMatchResult', () => {
    test('should record match result and update ELO', () => {
      const result = seasonTournament.recordMatchResult('t1', 'p1', 'p2', 'win');
      
      expect(result).not.toBeNull();
      expect(result.result).toBe('win');
      expect(result.playerId).toBe('p1');
    });

    test('should return null for invalid input', () => {
      expect(seasonTournament.recordMatchResult(null, 'p1', 'p2', 'win')).toBeNull();
      expect(seasonTournament.recordMatchResult('t1', 'p1', 'p2', null)).toBeNull();
    });
  });

  describe('distributeTournamentRewards', () => {
    test('should return empty array for non-existent tournament', () => {
      const rewards = seasonTournament.distributeTournamentRewards('nonexistent');
      expect(rewards).toEqual([]);
    });

    test('should return empty array when no champion yet', () => {
      // Create bracket without completing it
      const players = [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' }
      ];
      const bracketSystem = new TournamentBracket();
      bracketSystem.createBracket('t_no_champion', players);
      
      // Set as bracket but no champion
      seasonTournament.bracket.brackets.set('t_no_champion', bracketSystem.getBracket('t_no_champion'));
      
      const rewards = seasonTournament.distributeTournamentRewards('t_no_champion');
      expect(rewards).toEqual([]);
    });

    test('should return empty array when bracket is null', () => {
      const rewards = seasonTournament.distributeTournamentRewards('null_bracket');
      expect(rewards).toEqual([]);
    });
  });

  describe('getTournamentHistory', () => {
    test('should return empty array initially', () => {
      const history = seasonTournament.getTournamentHistory();
      expect(history).toEqual([]);
    });
  });

  describe('getPlayerMatchHistory', () => {
    test('should return empty array for player with no matches', () => {
      const history = seasonTournament.getPlayerMatchHistory('p1');
      expect(history).toEqual([]);
    });
  });

  describe('resetTournament', () => {
    test('should reset tournament data', () => {
      seasonTournament.registerForTournament('t1', 'p1', { name: 'Player 1' });
      seasonTournament.resetTournament('t1');
      
      const players = seasonTournament.getRegisteredPlayers('t1');
      expect(players).toEqual([]);
    });
  });
});

describe('SeasonTournamentWithSeasonManager', () => {
  let seasonTournament;
  let mockSeasonManager;

  beforeEach(() => {
    mockSeasonManager = {
      getCurrentSeason: jest.fn(() => ({
        id: 'S1',
        status: 'active',
        startTime: Date.now(),
        endTime: Date.now() + 86400000
      })),
      startSeason: jest.fn(),
      getSeasonStats: jest.fn()
    };
    seasonTournament = new SeasonTournamentWithSeasonManager(mockSeasonManager);
    localStorageMock._reset();
  });

  describe('registerForCurrentSeason', () => {
    test('should register for current season', () => {
      const result = seasonTournament.registerForCurrentSeason('p1', { name: 'Player 1' });
      
      expect(result.success).toBe(true);
      expect(result.tournamentId).toBeTruthy();
      expect(result.seasonId).toBe('S1');
    });

    test('should fail when no active season', () => {
      mockSeasonManager.getCurrentSeason.mockReturnValue(null);
      
      const result = seasonTournament.registerForCurrentSeason('p1', { name: 'Player 1' });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No active season');
    });
  });

  describe('startTournamentInCurrentSeason', () => {
    test('should start tournament in current season', () => {
      const regResult = seasonTournament.registerForCurrentSeason('p1', { name: 'Player 1' });
      seasonTournament.registerForTournament(regResult.tournamentId, 'p2', { name: 'Player 2' });
      
      const result = seasonTournament.startTournamentInCurrentSeason(regResult.tournamentId);
      
      expect(result.success).toBe(true);
      expect(result.bracket).not.toBeNull();
    });

    test('should fail when no active season', () => {
      mockSeasonManager.getCurrentSeason.mockReturnValue(null);
      
      const result = seasonTournament.startTournamentInCurrentSeason('t1');
      
      expect(result.success).toBe(false);
    });
  });

  describe('getCurrentSeasonTournaments', () => {
    test('should return empty when no active season', () => {
      mockSeasonManager.getCurrentSeason.mockReturnValue(null);
      
      const tournaments = seasonTournament.getCurrentSeasonTournaments();
      
      expect(tournaments).toEqual([]);
    });

    test('should return empty list when season has no tournaments', () => {
      // No tournaments registered
      const tournaments = seasonTournament.getCurrentSeasonTournaments();
      expect(tournaments).toEqual([]);
    });
  });
});

describe('Integration Tests', () => {
  let bracket;
  let eloRating;
  let seasonTournament;

  beforeEach(() => {
    bracket = new TournamentBracket();
    eloRating = new ELORating();
    seasonTournament = new SeasonTournament(null, eloRating, bracket);
    localStorageMock._reset();
  });

  afterEach(() => {
    // Cleanup
    try {
      bracket.brackets.clear();
      eloRating.resetAllRatings();
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  test('Championship progression', () => {
    const players = [
      { id: 'p1', name: 'Player 1' },
      { id: 'p2', name: 'Player 2' }
    ];
    bracket.createBracket('finals', players);
    
    const champion = bracket.getChampion('finals');
    expect(champion).toBeNull(); // Not decided yet
    
    // Simulate final match
    const matches = bracket.getMatches('finals');
    bracket.simulateMatch('finals', matches[0].id, { winnerId: 'p1' });
    
    const finalChampion = bracket.getChampion('finals');
    expect(finalChampion.id).toBe('p1');
  });

  test('ELO rating changes after win and loss', () => {
    // Record win
    const winResult = seasonTournament.recordMatchResult('t1', 'p1', 'p2', 'win');
    expect(winResult).not.toBeNull();
    expect(winResult.result).toBe('win');
    expect(eloRating.getPlayerRating('p1')).toBeGreaterThan(1500);
    
    // Record another win
    const winResult2 = seasonTournament.recordMatchResult('t1', 'p3', 'p4', 'win');
    expect(winResult2).not.toBeNull();
    expect(winResult2.result).toBe('win');
    expect(eloRating.getPlayerRating('p3')).toBeGreaterThan(1500);
  });

  test('ELO rating changes after loss', () => {
    const lossResult = seasonTournament.recordMatchResult('t1', 'p1', 'p2', 'loss');
    expect(lossResult).not.toBeNull();
    expect(lossResult.result).toBe('loss');
    expect(eloRating.getPlayerRating('p1')).toBeLessThan(1500);
  });
});

describe('branch coverage improvements', () => {
  let bracket;
  let eloRating;

  beforeEach(() => {
    bracket = new TournamentBracket();
    eloRating = new ELORating();
    localStorageMock._reset();
    jest.clearAllMocks();
  });

  test('_nextPowerOfTwo calculates correctly', () => {
    expect(bracket._nextPowerOfTwo(1)).toBe(1);
    expect(bracket._nextPowerOfTwo(3)).toBe(4);
    expect(bracket._nextPowerOfTwo(5)).toBe(8);
    expect(bracket._nextPowerOfTwo(8)).toBe(8);
  });

  test('_seedPlayers sorts by seed and fills byes', () => {
    const players = [
      { id: 'p2', name: 'Player 2', seed: 2 },
      { id: 'p1', name: 'Player 1', seed: 1 },
      { id: 'p3', name: 'Player 3', seed: 3 }
    ];

    const seeded = bracket._seedPlayers(players, 4);

    expect(seeded.length).toBe(4);
    expect(seeded[0].id).toBe('p1');
    expect(seeded[1].id).toBe('p2');
    expect(seeded[2].id).toBe('p3');
    expect(seeded[3].isBye).toBe(true);
  });

  test('_seedPlayers handles players with no seed', () => {
    const players = [
      { id: 'p1', name: 'Player 1' },
      { id: 'p2', name: 'Player 2' }
    ];

    const seeded = bracket._seedPlayers(players, 4);

    expect(seeded.length).toBe(4);
    expect(seeded[0].id).toBe('p1');
    expect(seeded[1].id).toBe('p2');
    expect(seeded[2].isBye).toBe(true);
    expect(seeded[3].isBye).toBe(true);
  });

  test('getTopPlayers handles empty storage', () => {
    const top = eloRating.getTopPlayers(10);
    expect(Array.isArray(top)).toBe(true);
  });

  test('getPlayerRank returns -1 for unknown player', () => {
    const rank = eloRating.getPlayerRank('unknown_player');
    expect(rank).toBe(-1);
  });

  test('getPlayerRank returns correct rank', () => {
    eloRating.setPlayerRating('p1', 1600);
    eloRating.setPlayerRating('p2', 1500);
    eloRating.setPlayerRating('p3', 1400);

    expect(eloRating.getPlayerRank('p1')).toBe(1);
    expect(eloRating.getPlayerRank('p2')).toBe(2);
    expect(eloRating.getPlayerRank('p3')).toBe(3);
  });

  test('getMatches returns empty array for unknown tournament', () => {
    const matches = bracket.getMatches('nonexistent');
    expect(matches).toEqual([]);
  });
});

describe('Cross-System Integration - SeasonTournament with MetagameTracker', () => {
  let bracket;
  let eloRating;
  let seasonTournament;
  let mockSeasonManager;
  let mockMetagameTracker;

  beforeEach(() => {
    mockSeasonManager = {
      getCurrentSeason: jest.fn(() => ({
        id: 'S1',
        status: 'active',
        stats: { totalGames: 60, totalWins: 30, winRate: 0.5 }
      })),
      getSeasonStats: jest.fn(() => ({
        id: 'S1',
        status: 'active',
        stats: { totalGames: 60, totalWins: 30, winRate: 0.5 }
      })),
      startSeason: jest.fn(),
      endSeason: jest.fn()
    };
    
    mockMetagameTracker = {
      getCardStats: jest.fn(),
      getDeckStats: jest.fn()
    };
    
    bracket = new TournamentBracket();
    eloRating = new ELORating();
    seasonTournament = new SeasonTournament(mockSeasonManager, eloRating, bracket);
    seasonTournament.setMetagameTracker(mockMetagameTracker);
    localStorageMock._reset();
  });

  describe('setMetagameTracker', () => {
    test('should set metagame tracker reference', () => {
      expect(seasonTournament.metaTracker).toBe(mockMetagameTracker);
    });
  });

  describe('getDynamicThresholds', () => {
    test('should return default thresholds when no metaTracker', () => {
      seasonTournament.metaTracker = null;
      const thresholds = seasonTournament.getDynamicThresholds('S1');
      
      expect(thresholds.minGames).toBe(10);
      expect(thresholds.minWinRate).toBe(0.45);
      expect(thresholds.eloBonus).toBe(0);
    });

    test('should return default thresholds when no season', () => {
      mockSeasonManager.getSeasonStats.mockReturnValue(null);
      const thresholds = seasonTournament.getDynamicThresholds('S1');
      
      expect(thresholds.minGames).toBe(10);
      expect(thresholds.minWinRate).toBe(0.45);
    });

    test('should adjust thresholds when season has high participation', () => {
      mockSeasonManager.getSeasonStats.mockReturnValue({
        id: 'S1',
        stats: { totalGames: 120, winRate: 0.55 }
      });
      
      const thresholds = seasonTournament.getDynamicThresholds('S1');
      
      expect(thresholds.minGames).toBe(15); // Increased from 10
      expect(thresholds.minWinRate).toBe(0.48); // Increased from 0.45
      expect(thresholds.totalSeasonGames).toBe(120);
    });

    test('should calculate elo bonus based on win rate', () => {
      mockSeasonManager.getSeasonStats.mockReturnValue({
        id: 'S1',
        stats: { totalGames: 50, winRate: 0.75 }
      });
      
      const thresholds = seasonTournament.getDynamicThresholds('S1');
      
      expect(thresholds.eloBonus).toBe(50); // High win rate >= 0.7
    });
  });

  describe('checkEligibility', () => {
    test('should return invalid for null playerId', () => {
      const result = seasonTournament.checkEligibility(null);
      
      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain('Invalid playerId');
    });

    test('should return false when no active season', () => {
      mockSeasonManager.getCurrentSeason.mockReturnValue(null);
      
      const result = seasonTournament.checkEligibility('p1');
      
      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain('No active season');
    });

    test('should return eligible when no metaTracker', () => {
      seasonTournament.metaTracker = null;
      
      const result = seasonTournament.checkEligibility('p1');
      
      expect(result.eligible).toBe(true);
    });

    test('should check player stats against thresholds', () => {
      // Set up player stats in localStorage
      localStorage.setItem('metagame_player_p1_S1', JSON.stringify({
        gamesPlayed: 8,
        wins: 3,
        losses: 5,
        winRate: 0.375
      }));
      
      const result = seasonTournament.checkEligibility('p1', { seasonId: 'S1' });
      
      expect(result.eligible).toBe(false);
      expect(result.reasons.some(r => r.includes('Games played'))).toBe(true);
    });

    test('should return eligible when player meets thresholds', () => {
      localStorage.setItem('metagame_player_p1_S1', JSON.stringify({
        gamesPlayed: 15,
        wins: 8,
        losses: 7,
        winRate: 0.533
      }));
      
      const result = seasonTournament.checkEligibility('p1', { seasonId: 'S1' });
      
      expect(result.eligible).toBe(true);
    });
  });

  describe('recordTournamentParticipation', () => {
    test('should do nothing when no metaTracker', () => {
      seasonTournament.metaTracker = null;
      
      expect(() => {
        seasonTournament.recordTournamentParticipation('t1', 'p1', { placement: 1 });
      }).not.toThrow();
    });

    test('should do nothing when no active season', () => {
      mockSeasonManager.getCurrentSeason.mockReturnValue(null);
      
      expect(() => {
        seasonTournament.recordTournamentParticipation('t1', 'p1', { placement: 1 });
      }).not.toThrow();
    });

    test('should record tournament participation', () => {
      seasonTournament.recordTournamentParticipation('t1', 'p1', { placement: 2 });
      
      const stored = localStorage.getItem('metagame_player_p1_S1');
      expect(stored).not.toBeNull();
      
      const stats = JSON.parse(stored);
      expect(stats.gamesPlayed).toBe(1);
      expect(stats.wins).toBe(1); // Top 4 placement counts as win
      expect(stats.lastTournamentId).toBe('t1');
    });
  });

  describe('getSeasonBasedEloBonus', () => {
    test('should return 0 when no player stats', () => {
      const bonus = seasonTournament.getSeasonBasedEloBonus('p1', 'S1');
      expect(bonus).toBe(0);
    });

    test('should calculate bonus based on player performance', () => {
      localStorage.setItem('metagame_player_p1_S1', JSON.stringify({
        gamesPlayed: 20,
        wins: 14,
        losses: 6,
        winRate: 0.7
      }));
      
      const bonus = seasonTournament.getSeasonBasedEloBonus('p1', 'S1');
      
      // base eloBonus from thresholds + extra for high win rate
      expect(bonus).toBeGreaterThan(0);
    });
  });

  describe('getTournamentSeasonStats', () => {
    test('should return basic stats when no active season', () => {
      mockSeasonManager.getCurrentSeason.mockReturnValue(null);
      
      const stats = seasonTournament.getTournamentSeasonStats('t1');
      
      expect(stats.totalParticipants).toBe(0);
      expect(stats.seasonActive).toBe(false);
    });

    test('should aggregate season stats from participants', () => {
      seasonTournament.registerForTournament('t1', 'p1', { name: 'Player 1' });
      seasonTournament.registerForTournament('t1', 'p2', { name: 'Player 2' });
      
      localStorage.setItem('metagame_player_p1_S1', JSON.stringify({
        gamesPlayed: 10,
        wins: 6,
        winRate: 0.6
      }));
      
      const stats = seasonTournament.getTournamentSeasonStats('t1');
      
      expect(stats.totalParticipants).toBe(2);
      expect(stats.participantsWithSeasonRecord).toBe(1);
      expect(stats.seasonActive).toBe(true);
      expect(stats.totalSeasonGames).toBe(10);
    });
  });

  describe('branch coverage improvements', () => {
    test('getCurrentRound returns 1 when currentRound becomes 0 or negative', () => {
      // This tests the branch at line 226: return currentRound > 0 ? currentRound : 1;
      // Set up a bracket where the tournament has progressed to the final
      const players = [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' }
      ];
      bracket.createBracket('t_bracket_test', players);
      
      // Simulate the match to completion
      const match = bracket.getMatches('t_bracket_test')[0];
      bracket.simulateMatch('t_bracket_test', match.id, { winnerId: 'p1' });
      
      const currentRound = bracket.getCurrentRound('t_bracket_test');
      expect(currentRound).toBe(1);
    });

    test('getCurrentRound returns -1 for non-existent bracket', () => {
      const currentRound = bracket.getCurrentRound('nonexistent_bracket');
      expect(currentRound).toBe(-1);
    });

    test('getTopPlayers handles empty ratings (branch coverage for lines 574-580)', () => {
      // Clear all ratings
      eloRating.resetAllRatings();
      
      const top = eloRating.getTopPlayers(10);
      expect(top).toEqual([]);
    });

    test('getTopPlayers returns players sorted by rating', () => {
      eloRating.setPlayerRating('p_low', 1200);
      eloRating.setPlayerRating('p_mid', 1500);
      eloRating.setPlayerRating('p_high', 1800);
      
      const top = eloRating.getTopPlayers(3);
      
      expect(top).toHaveLength(3);
      expect(top[0].playerId).toBe('p_high');
      expect(top[0].rating).toBe(1800);
      expect(top[1].playerId).toBe('p_mid');
      expect(top[2].playerId).toBe('p_low');
    });

    test('getTopPlayers respects limit parameter', () => {
      eloRating.setPlayerRating('p1', 1600);
      eloRating.setPlayerRating('p2', 1700);
      eloRating.setPlayerRating('p3', 1800);
      eloRating.setPlayerRating('p4', 1900);
      eloRating.setPlayerRating('p5', 2000);
      
      const top = eloRating.getTopPlayers(3);
      expect(top).toHaveLength(3);
      expect(top[0].rank).toBe(1);
      expect(top[1].rank).toBe(2);
      expect(top[2].rank).toBe(3);
    });

    test('resetAllRatings handles localStorage error gracefully', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => { throw new Error('Storage error'); });
      
      expect(() => eloRating.resetAllRatings()).not.toThrow();
      
      localStorage.getItem = originalGetItem;
    });

    test('registerForTournament catches localStorage error', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => { throw new Error('Storage error'); });
      
      const result = seasonTournament.registerForTournament('t1', 'p_error_test', { name: 'Error Test' });
      expect(result).toBe(true); // Still returns true because it's at the end of the function
      
      localStorage.setItem = originalSetItem;
    });

    test('getRegisteredPlayers returns empty array for null tournamentId', () => {
      const players = seasonTournament.getRegisteredPlayers(null);
      expect(players).toEqual([]);
    });

    test('getTournamentHistory returns empty array when no data', () => {
      const history = seasonTournament.getTournamentHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    test('getTournamentHistory filters by playerId when provided', () => {
      // Register a player
      seasonTournament.registerForTournament('t_history', 'p_history', { name: 'History Player' });
      
      // Manually create a bracket in localStorage
      localStorage.setItem('season_tournament_t_history_bracket', JSON.stringify({
        champion: 'p_other',
        status: 'completed',
        createdAt: Date.now()
      }));
      
      const allHistory = seasonTournament.getTournamentHistory();
      const playerHistory = seasonTournament.getTournamentHistory('p_history');
      
      expect(Array.isArray(allHistory)).toBe(true);
      expect(Array.isArray(playerHistory)).toBe(true);
    });

    test('getPlayerRatingHistory returns empty for null playerId', () => {
      const history = seasonTournament.getPlayerRatingHistory(null);
      expect(history).toEqual([]);
    });

    test('getPlayerMatchHistory returns empty for null playerId', () => {
      const history = seasonTournament.getPlayerMatchHistory(null);
      expect(history).toEqual([]);
    });

    test('resetTournament handles invalid tournamentId', () => {
      expect(() => seasonTournament.resetTournament(null)).not.toThrow();
      expect(() => seasonTournament.resetTournament('nonexistent')).not.toThrow();
    });

    test('startTournament returns null for less than 2 players', () => {
      seasonTournament.registerForTournament('t_few', 'p_only_one', { name: 'Solo' });
      
      const result = seasonTournament.startTournament('t_few');
      expect(result).toBeNull();
    });

    test('recordMatchResult returns null for invalid input', () => {
      expect(seasonTournament.recordMatchResult(null, 'p1', 'p2', 'win')).toBeNull();
      expect(seasonTournament.recordMatchResult('t1', null, 'p2', 'win')).toBeNull();
      expect(seasonTournament.recordMatchResult('t1', 'p1', null, 'win')).toBeNull();
      expect(seasonTournament.recordMatchResult('t1', 'p1', 'p2', null)).toBeNull();
    });

    test('getSeasonBasedEloBonus returns higher bonus for very high win rate', () => {
      // Set up season stats to return winRate >= 0.6 so eloBonus = 25
      mockSeasonManager.getSeasonStats.mockReturnValue({
        id: 'S1',
        stats: { totalGames: 60, winRate: 0.65 }
      });
      
      localStorage.setItem('metagame_player_p1_S1', JSON.stringify({
        gamesPlayed: 20,
        wins: 13,
        losses: 7,
        winRate: 0.65 // >= 0.6 but < 0.7
      }));
      
      const bonus = seasonTournament.getSeasonBasedEloBonus('p1', 'S1');
      
      // base eloBonus (25 for season winRate 0.6-0.7) + extra 15 for player winRate 0.6-0.7
      expect(bonus).toBe(40);
    });

    test('getTournamentSeasonStats handles players with no season record', () => {
      seasonTournament.registerForTournament('t1', 'p_no_record', { name: 'No Record' });
      seasonTournament.registerForTournament('t1', 'p_with_record', { name: 'With Record' });
      
      localStorage.setItem('metagame_player_p_with_record_S1', JSON.stringify({
        gamesPlayed: 10,
        wins: 6,
        winRate: 0.6
      }));
      
      const stats = seasonTournament.getTournamentSeasonStats('t1');
      
      expect(stats.totalParticipants).toBe(2);
      expect(stats.participantsWithSeasonRecord).toBe(1);
      expect(stats.seasonActive).toBe(true);
    });

    test('getDynamicThresholds returns default when metaTracker is null', () => {
      seasonTournament.metaTracker = null;
      const thresholds = seasonTournament.getDynamicThresholds('S1');
      
      expect(thresholds.minGames).toBe(10);
      expect(thresholds.minWinRate).toBe(0.45);
      expect(thresholds.eloBonus).toBe(0);
    });

    test('getDynamicThresholds handles totalGames exactly at boundary (50)', () => {
      mockSeasonManager.getSeasonStats.mockReturnValue({
        id: 'S1',
        stats: { totalGames: 50, winRate: 0.5 }
      });
      
      const thresholds = seasonTournament.getDynamicThresholds('S1');
      
      // totalGames = 50 is NOT > 50, so should use default values
      expect(thresholds.minGames).toBe(10);
    });

    test('getDynamicThresholds handles totalGames > 50 boundary', () => {
      mockSeasonManager.getSeasonStats.mockReturnValue({
        id: 'S1',
        stats: { totalGames: 51, winRate: 0.5 }
      });
      
      const thresholds = seasonTournament.getDynamicThresholds('S1');
      
      expect(thresholds.minGames).toBe(12);
    });
  });

  describe('branch coverage - remaining branches', () => {
    test('getPlayerRatingHistory handles localStorage error gracefully', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => { throw new Error('Storage error'); });
      
      const history = seasonTournament.getPlayerRatingHistory('p1');
      expect(history).toEqual([]);
      
      localStorage.getItem = originalGetItem;
    });

    test('_getPlayerSeasonStats handles localStorage error gracefully', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => { throw new Error('Storage error'); });
      
      const stats = seasonTournament._getPlayerSeasonStats('p1', 'S1');
      expect(stats).toBeNull();
      
      localStorage.getItem = originalGetItem;
    });

    test('_calculateTournamentRanking returns empty for null bracket', () => {
      // Create a tournament but don't start it (no bracket)
      const ranking = seasonTournament._calculateTournamentRanking('t_no_bracket');
      expect(ranking).toEqual([]);
    });
  });

  describe('recordTournamentParticipation catches localStorage error', () => {
    test('recordTournamentParticipation catches localStorage error', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => { throw new Error('Storage error'); });
      
      // Should not throw
      expect(() => seasonTournament.recordTournamentParticipation('t1', 'p1', { placement: 1 })).not.toThrow();
      
      localStorage.setItem = originalSetItem;
    });
  });

  describe('ELORating error handling branches', () => {
    let eloRating;

    beforeEach(() => {
      eloRating = new ELORating();
      localStorageMock._reset();
    });

    test('getTopPlayers catches localStorage error', () => {
      const originalKey = localStorage.key;
      localStorage.key = jest.fn(() => { throw new Error('Storage error'); });
      
      // Pre-populate memory cache with a rating that won't be in localStorage
      eloRating.setPlayerRating('p_memory_only', 1800);
      
      const top = eloRating.getTopPlayers(10);
      expect(Array.isArray(top)).toBe(true);
      // The memory cache rating should still be included even though localStorage failed
      expect(top.length).toBeGreaterThan(0);
      
      localStorage.key = originalKey;
    });

    test('resetAllRatings catches localStorage error', () => {
      const originalKey = localStorage.key;
      localStorage.key = jest.fn(() => { throw new Error('Storage error'); });
      
      expect(() => eloRating.resetAllRatings()).not.toThrow();
      
      localStorage.key = originalKey;
    });

    test('_savePlayerRating catches localStorage error', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => { throw new Error('Storage error'); });
      
      expect(() => eloRating.setPlayerRating('p1', 1500)).not.toThrow();
      
      localStorage.setItem = originalSetItem;
    });
  });

  describe('SeasonTournament error handling branches', () => {
    let seasonTournament;
    let eloRating;
    let bracket;

    beforeEach(() => {
      eloRating = new ELORating();
      bracket = new TournamentBracket();
      seasonTournament = new SeasonTournamentWithSeasonManager(null, eloRating, bracket);
      localStorageMock._reset();
    });

    test('getRegisteredPlayers catches localStorage error', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => { throw new Error('Storage error'); });
      
      const players = seasonTournament.getRegisteredPlayers('t1');
      expect(Array.isArray(players)).toBe(true);
      
      localStorage.getItem = originalGetItem;
    });

    test('startTournament catches localStorage error', () => {
      // Register players first
      seasonTournament.registerForTournament('t_error', 'p1', { name: 'P1' });
      seasonTournament.registerForTournament('t_error', 'p2', { name: 'P2' });
      
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => { throw new Error('Storage error'); });
      
      const result = seasonTournament.startTournament('t_error');
      // Should still return bracket (error is caught)
      expect(result).not.toBeNull();
      
      localStorage.setItem = originalSetItem;
    });
  });

  describe('TournamentRanking and Reward branches', () => {
    let bracket;
    let eloRating;
    let seasonTournament;

    beforeEach(() => {
      eloRating = new ELORating();
      bracket = new TournamentBracket();
      seasonTournament = new SeasonTournamentWithSeasonManager(null, eloRating, bracket);
      localStorageMock._reset();
    });

    test('_getBaseRewardForRank returns correct rewards for all ranks', () => {
      expect(seasonTournament._getBaseRewardForRank(1)).toBe(1000); // champion
      expect(seasonTournament._getBaseRewardForRank(2)).toBe(500);  // runner-up
      expect(seasonTournament._getBaseRewardForRank(3)).toBe(250);  // third place
      expect(seasonTournament._getBaseRewardForRank(4)).toBe(100);  // fourth place
      expect(seasonTournament._getBaseRewardForRank(5)).toBe(50);   // default
    });

    test('_playerInTournament returns true when player exists in tournament', () => {
      seasonTournament.registerForTournament('t_player_check', 'p_check', { name: 'Check Player' });
      
      const exists = seasonTournament._playerInTournament('t_player_check', 'p_check');
      expect(exists).toBe(true);
    });

    test('_playerInTournament returns false when player not in tournament', () => {
      const exists = seasonTournament._playerInTournament('t_no_player', 'p_no_one');
      expect(exists).toBe(false);
    });

    test('_calculateTournamentRanking returns empty for non-existent tournament', () => {
      const ranking = seasonTournament._calculateTournamentRanking('t_does_not_exist');
      expect(ranking).toEqual([]);
    });

    test('getRegisteredPlayers handles localStorage error gracefully', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => { throw new Error('Storage error'); });
      
      const players = seasonTournament.getRegisteredPlayers('t_error');
      expect(players).toEqual([]);
      
      localStorage.getItem = originalGetItem;
    });

    test('getTournamentHistory handles localStorage error gracefully', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => { throw new Error('Storage error'); });
      
      const history = seasonTournament.getTournamentHistory();
      expect(history).toEqual([]);
      
      localStorage.getItem = originalGetItem;
    });

    test('getPlayerRatingHistory handles JSON parse error', () => {
      localStorage.setItem('elo_rating_p1_history', 'invalid json{{{');
      
      const history = seasonTournament.getPlayerRatingHistory('p1');
      expect(history).toEqual([]);
    });

    test('getPlayerMatchHistory handles localStorage error gracefully', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => { throw new Error('Storage error'); });
      
      const history = seasonTournament.getPlayerMatchHistory('p1');
      expect(history).toEqual([]);
      
      localStorage.getItem = originalGetItem;
    });

    test('distributeTournamentRewards calculates rewards when tournament has champion', () => {
      // Register players first so _calculateTournamentRanking can find them
      seasonTournament.registerForTournament('t_rewards', 'p1', { name: 'Player 1', playerId: 'p1' });
      seasonTournament.registerForTournament('t_rewards', 'p2', { name: 'Player 2', playerId: 'p2' });
      
      // Create a complete tournament with champion
      const players = [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' }
      ];
      bracket.createBracket('t_rewards', players);
      
      // Simulate the final match to create champion
      const match = bracket.getMatches('t_rewards')[0];
      bracket.simulateMatch('t_rewards', match.id, { winnerId: 'p1' });
      
      const bracketData = bracket.getBracket('t_rewards');
      bracketData.playerRecords = { p1: { wins: 1, losses: 0 }, p2: { wins: 0, losses: 1 } };
      seasonTournament.bracket.brackets.set('t_rewards', bracketData);
      
      const rewards = seasonTournament.distributeTournamentRewards('t_rewards');
      // Rewards should be calculated since bracket has champion
      expect(rewards).not.toEqual([]);
      expect(rewards[0].rank).toBeDefined();
    });

    test('recordTournamentParticipation handles localStorage error gracefully', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => { throw new Error('Storage error'); });
      
      expect(() => seasonTournament.recordTournamentParticipation('t1', 'p1', { placement: 1 })).not.toThrow();
      
      localStorage.setItem = originalSetItem;
    });
  });
});