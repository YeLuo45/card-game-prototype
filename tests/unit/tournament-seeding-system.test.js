/**
 * V259 Tournament Seeding System Tests (Iteration 5/9)
 * Tests for TournamentSeedingSystem | SeedingPipeline | BracketGenerator | MatchPredictor
 */

const {
  TournamentSeedingSystem,
  SeedingPipeline,
  BracketGenerator,
  MatchPredictor
} = require('../../src/tournament-seeding-system.js');

// ============== BracketGenerator Tests ==============
describe('BracketGenerator', () => {
  let generator;
  let mockParticipants;

  beforeEach(() => {
    generator = new BracketGenerator();
    mockParticipants = [
      { id: 'p1', name: 'Player1', rating: 1800, recentWins: 5 },
      { id: 'p2', name: 'Player2', rating: 1700, recentWins: 4 },
      { id: 'p3', name: 'Player3', rating: 1600, recentWins: 3 },
      { id: 'p4', name: 'Player4', rating: 1500, recentWins: 3 },
      { id: 'p5', name: 'Player5', rating: 1400, recentWins: 2 },
      { id: 'p6', name: 'Player6', rating: 1300, recentWins: 2 },
      { id: 'p7', name: 'Player7', rating: 1200, recentWins: 1 },
      { id: 'p8', name: 'Player8', rating: 1100, recentWins: 1 }
    ];
  });

  describe('collaborativeGenerate', () => {
    test('should generate a valid bracket', () => {
      const result = generator.collaborativeGenerate(mockParticipants, { seeds: 8 });
      
      expect(result).toBeDefined();
      expect(result.format).toBe('single-elimination');
      expect(result.seeds).toBe(8);
      expect(result.participants).toBe(8);
      expect(result.totalMatches).toBe(4); // 8 participants / 2 = 4 first round matches
    });

    test('should organize matches into rounds', () => {
      const result = generator.collaborativeGenerate(mockParticipants, { seeds: 8 });
      
      expect(result.rounds).toBeDefined();
      expect(Array.isArray(result.rounds)).toBe(true);
      expect(result.rounds.length).toBeGreaterThan(0);
      expect(result.rounds[0].round).toBe(1);
      expect(result.rounds[0].matches).toBeDefined();
    });

    test('should handle different seed counts', () => {
      const result4 = generator.collaborativeGenerate(mockParticipants.slice(0, 4), { seeds: 4 });
      expect(result4.totalMatches).toBe(2);
      
      const result16 = generator.collaborativeGenerate(mockParticipants, { seeds: 16 });
      expect(result16.totalMatches).toBe(4);
    });
  });

  describe('generateSeedingLayer', () => {
    test('should sort participants by score', () => {
      const seeds = generator.generateSeedingLayer(mockParticipants, 8);
      
      expect(seeds[0].seed).toBe(1);
      expect(seeds[7].seed).toBe(8);
      expect(seeds[0].rating).toBeGreaterThanOrEqual(seeds[7].rating);
    });

    test('should assign correct seed power', () => {
      const seeds = generator.generateSeedingLayer(mockParticipants, 8);
      
      expect(seeds[0].power).toBe(1.0);
      expect(seeds[1].power).toBe(0.9);
      expect(seeds[2].power).toBe(0.8);
      expect(seeds[3].power).toBe(0.8);
    });

    test('should handle fewer participants than seeds', () => {
      const participants2 = mockParticipants.slice(0, 2);
      const seeds = generator.generateSeedingLayer(participants2, 8);
      
      expect(seeds.length).toBe(2);
      expect(seeds[0].seed).toBe(1);
      expect(seeds[1].seed).toBe(2);
    });
  });

  describe('generateMatchLayer', () => {
    test('should create correct match pairings', () => {
      const seeds = generator.generateSeedingLayer(mockParticipants, 8);
      const matches = generator.generateMatchLayer(seeds);
      
      expect(matches.length).toBe(4);
      // Seed 1 should play Seed 8
      expect(matches[0].player1.seed).toBe(1);
      expect(matches[0].player2.seed).toBe(8);
      // Seed 2 should play Seed 7
      expect(matches[1].player1.seed).toBe(2);
      expect(matches[1].player2.seed).toBe(7);
    });

    test('should set correct round', () => {
      const seeds = generator.generateSeedingLayer(mockParticipants, 8);
      const matches = generator.generateMatchLayer(seeds);
      
      matches.forEach(match => {
        expect(match.round).toBe(1);
      });
    });
  });

  describe('calculateSeedPower', () => {
    test('should return correct power for each seed', () => {
      expect(generator.calculateSeedPower(1)).toBe(1.0);
      expect(generator.calculateSeedPower(2)).toBe(0.9);
      expect(generator.calculateSeedPower(3)).toBe(0.8);
      expect(generator.calculateSeedPower(4)).toBe(0.8);
      expect(generator.calculateSeedPower(5)).toBe(0.7);
      expect(generator.calculateSeedPower(8)).toBe(0.7);
      expect(generator.calculateSeedPower(16)).toBe(0.5);
    });
  });

  describe('balanceBracket', () => {
    test('should return unchanged matches when balanced', () => {
      const seeds = generator.generateSeedingLayer(mockParticipants, 8);
      const matches = generator.generateMatchLayer(seeds);
      const balanced = generator.balanceBracket(matches);
      
      expect(balanced.length).toBe(matches.length);
    });

    test('should apply fuzzy balance for imbalanced matches', () => {
      const imbalancedMatches = [
        { id: 'match_0', player1: { seed: 1 }, player2: { seed: 8 }, round: 1, seedDifference: 7 }
      ];
      
      generator.clearCache();
      const balanced = generator.balanceBracket(imbalancedMatches);
      
      expect(balanced[0].seedDifference).toBe(7);
    });
  });

  describe('organizeIntoRounds', () => {
    test('should organize matches by round', () => {
      const seeds = generator.generateSeedingLayer(mockParticipants, 8);
      const matches = generator.generateMatchLayer(seeds);
      const rounds = generator.organizeIntoRounds(matches);
      
      expect(rounds[0].round).toBe(1);
      expect(rounds[0].matches.length).toBe(4);
      expect(rounds[0].nextRound).toBeDefined();
    });
  });

  describe('generateNextRoundMatches', () => {
    test('should generate next round from winners', () => {
      const previousMatches = [
        { id: 'match_0', winner: { name: 'Winner1' }, round: 1 },
        { id: 'match_1', winner: { name: 'Winner2' }, round: 1 }
      ];
      
      const nextMatches = generator.generateNextRoundMatches(previousMatches);
      
      expect(nextMatches.length).toBe(1);
      expect(nextMatches[0].round).toBe(2);
      expect(nextMatches[0].player1).toEqual({ name: 'Winner1' });
      expect(nextMatches[0].player2).toEqual({ name: 'Winner2' });
    });

    test('should handle odd number of matches', () => {
      const previousMatches = [
        { id: 'match_0', winner: { name: 'Winner1' }, round: 1 }
      ];
      
      const nextMatches = generator.generateNextRoundMatches(previousMatches);
      
      expect(nextMatches.length).toBe(0);
    });
  });

  describe('logCollaboration', () => {
    test('should record collaboration events', () => {
      generator.logCollaboration('test_event', { data: 'test' });
      
      expect(generator.collaborationLog.length).toBeGreaterThan(0);
      expect(generator.collaborationLog[0].event).toBe('test_event');
    });
  });

  describe('getCollaborationLog', () => {
    test('should return collaboration log', () => {
      generator.logCollaboration('event1', { data: 1 });
      generator.logCollaboration('event2', { data: 2 });
      
      const log = generator.getCollaborationLog();
      
      expect(log.length).toBe(2);
    });
  });

  describe('clearCache', () => {
    test('should clear all cached data', () => {
      generator.bracketCache.set('test', 'value');
      generator.logCollaboration('test', {});
      
      generator.clearCache();
      
      expect(generator.bracketCache.size).toBe(0);
      expect(generator.collaborationLog.length).toBe(0);
    });
  });
});

// ============== MatchPredictor Tests ==============
describe('MatchPredictor', () => {
  let predictor;
  let player1;
  let player2;

  beforeEach(() => {
    predictor = new MatchPredictor();
    player1 = {
      id: 'p1',
      name: 'Player1',
      rating: 1600,
      recentMatches: [{ won: true }, { won: true }, { won: false }, { won: true }, { won: true }],
      deckWinRate: 0.6,
      synergyScore: 0.8
    };
    player2 = {
      id: 'p2',
      name: 'Player2',
      rating: 1500,
      recentMatches: [{ won: true }, { won: false }, { won: false }, { won: true }, { won: false }],
      deckWinRate: 0.5,
      synergyScore: 0.6
    };
  });

  describe('autonomousPredict', () => {
    test('should predict winner based on ratings', () => {
      const prediction = predictor.autonomousPredict(player1, player2);
      
      expect(prediction).toBeDefined();
      expect(prediction.player1WinProbability).toBeDefined();
      expect(prediction.player2WinProbability).toBeDefined();
      expect(prediction.expectedWinner).toBe('player1');
      expect(prediction.confidence).toBeGreaterThan(0);
    });

    test('should calculate win probabilities that sum to 1', () => {
      const prediction = predictor.autonomousPredict(player1, player2);
      
      const sum = prediction.player1WinProbability + prediction.player2WinProbability;
      expect(sum).toBeCloseTo(1, 2);
    });

    test('should include recommended bet', () => {
      const prediction = predictor.autonomousPredict(player1, player2);
      
      expect(['player1', 'player2', 'pass']).toContain(prediction.recommendedBet);
    });

    test('should learn when autonomous mode is enabled', () => {
      predictor.setAutonomousMode(true);
      predictor.autonomousPredict(player1, player2);
      
      const model = predictor.getPredictionModel('p1', 'p2');
      expect(model).toBeDefined();
      expect(model.predictions.length).toBe(1);
    });

    test('should not learn when autonomous mode is disabled', () => {
      predictor.setAutonomousMode(false);
      predictor.autonomousPredict(player1, player2);
      
      const model = predictor.getPredictionModel('p1', 'p2');
      expect(model).toBeUndefined();
    });
  });

  describe('calculateRecentForm', () => {
    test('should calculate correct recent form', () => {
      const form = predictor.calculateRecentForm(player1);
      
      // 4 wins out of 5 recent matches
      expect(form).toBeCloseTo(0.8, 1);
    });

    test('should return 0.5 for player with no recent matches', () => {
      const noRecentPlayer = { id: 'p', name: 'Player', rating: 1500 };
      const form = predictor.calculateRecentForm(noRecentPlayer);
      
      expect(form).toBe(0.5);
    });

    test('should only count last 5 matches', () => {
      const playerWithManyMatches = {
        ...player1,
        recentMatches: [
          { won: false }, { won: false }, { won: false }, { won: false }, { won: false }, // older
          { won: true }, { won: true }, { won: true }, { won: true }, { won: true }  // recent
        ]
      };
      
      const form = predictor.calculateRecentForm(playerWithManyMatches);
      
      // Should only count recent 5: 5 wins out of 5
      expect(form).toBe(1.0);
    });
  });

  describe('calculateDeckAdvantage', () => {
    test('should calculate deck advantage based on win rates', () => {
      const advantage = predictor.calculateDeckAdvantage(player1, player2);
      
      expect(advantage).toBeCloseTo(0.1, 1); // 0.6 - 0.5 = 0.1
    });

    test('should factor in synergy scores', () => {
      const playerWithHighSynergy = {
        ...player1,
        synergyScore: 1.0
      };
      
      const advantage = predictor.calculateDeckAdvantage(playerWithHighSynergy, player2);
      
      expect(advantage).toBeGreaterThan(0.1);
    });

    test('should return 0 when no deck data', () => {
      const noDeckPlayer1 = { id: 'p1', name: 'Player1' };
      const noDeckPlayer2 = { id: 'p2', name: 'Player2' };
      
      const advantage = predictor.calculateDeckAdvantage(noDeckPlayer1, noDeckPlayer2);
      
      expect(advantage).toBe(0);
    });
  });

  describe('extractFeatures', () => {
    test('should extract correct features', () => {
      const analysis = {
        player1Rating: 1600,
        player2Rating: 1500,
        player1RecentForm: 0.8,
        player2RecentForm: 0.4,
        deckAdvantage: 0.1,
        player1Experience: 10,
        player2Experience: 5
      };
      
      const features = predictor.extractFeatures(analysis);
      
      expect(features.ratingDiff).toBe(100);
      expect(features.formDiff).toBe(0.4);
      expect(features.deckAdvantage).toBe(0.1);
      expect(features.experience).toBe(5);
    });
  });

  describe('runPredictionModel', () => {
    test('should predict higher win probability for better rated player', () => {
      const features = {
        ratingDiff: 200,
        formDiff: 0,
        deckAdvantage: 0
      };
      
      const prediction = predictor.runPredictionModel(features);
      
      expect(prediction.player1WinProbability).toBeGreaterThan(0.5);
      expect(prediction.expectedWinner).toBe('player1');
    });

    test('should predict lower win probability for worse rated player', () => {
      const features = {
        ratingDiff: -200,
        formDiff: 0,
        deckAdvantage: 0
      };
      
      const prediction = predictor.runPredictionModel(features);
      
      expect(prediction.player2WinProbability).toBeGreaterThan(0.5);
      expect(prediction.expectedWinner).toBe('player2');
    });
  });

  describe('calculatePredictionConfidence', () => {
    test('should calculate confidence based on rating difference', () => {
      const features = { ratingDiff: 200, formDiff: 0 };
      
      const confidence = predictor.calculatePredictionConfidence(features);
      
      expect(confidence).toBeGreaterThan(0.5);
    });

    test('should return higher confidence for larger rating differences', () => {
      const smallDiffFeatures = { ratingDiff: 50, formDiff: 0 };
      const largeDiffFeatures = { ratingDiff: 400, formDiff: 0 };
      
      const smallConfidence = predictor.calculatePredictionConfidence(smallDiffFeatures);
      const largeConfidence = predictor.calculatePredictionConfidence(largeDiffFeatures);
      
      expect(largeConfidence).toBeGreaterThan(smallConfidence);
    });
  });

  describe('adjustConfidence', () => {
    test('should reduce confidence for finals', () => {
      const prediction = {
        player1WinProbability: 0.7,
        player2WinProbability: 0.3,
        confidence: 0.8
      };
      
      const adjusted = predictor.adjustConfidence(prediction, { tournamentContext: 'finals' });
      
      expect(adjusted.confidence).toBeLessThan(0.8);
    });

    test('should adjust probabilities for deck matchup', () => {
      const prediction = {
        player1WinProbability: 0.5,
        player2WinProbability: 0.5,
        confidence: 0.6
      };
      
      const adjusted = predictor.adjustConfidence(prediction, { 
        deckMatchup: { advantage: 0.3 } 
      });
      
      expect(adjusted.player1WinProbability).toBeGreaterThan(0.5);
    });
  });

  describe('finalizePrediction', () => {
    test('should round probabilities to 2 decimal places', () => {
      const prediction = {
        player1WinProbability: 0.666,
        player2WinProbability: 0.334,
        confidence: 0.8125
      };
      
      const finalized = predictor.finalizePrediction(prediction);
      
      expect(finalized.player1WinProbability).toBe(0.67);
      expect(finalized.player2WinProbability).toBe(0.33);
      expect(finalized.confidence).toBe(0.81);
    });

    test('should pass through extreme values', () => {
      const prediction = {
        player1WinProbability: 1.5,
        player2WinProbability: -0.5,
        confidence: 1.5
      };
      
      const finalized = predictor.finalizePrediction(prediction);
      
      expect(finalized.player1WinProbability).toBe(1.5);
      expect(finalized.player2WinProbability).toBe(-0.5);
    });
  });

  describe('learnFromPrediction', () => {
    test('should store prediction in model', () => {
      const prediction = {
        player1WinProbability: 0.7,
        player2WinProbability: 0.3,
        confidence: 0.8
      };
      
      predictor.learnFromPrediction(player1, player2, prediction);
      
      const model = predictor.getPredictionModel('p1', 'p2');
      expect(model).toBeDefined();
      expect(model.predictions.length).toBe(1);
    });

    test('should limit prediction history to 20', () => {
      const prediction = {
        player1WinProbability: 0.7,
        player2WinProbability: 0.3,
        confidence: 0.8
      };
      
      for (let i = 0; i < 25; i++) {
        predictor.learnFromPrediction(player1, player2, prediction);
      }
      
      const model = predictor.getPredictionModel('p1', 'p2');
      expect(model.predictions.length).toBe(20);
    });
  });

  describe('getPredictionModel', () => {
    test('should return undefined for non-existent model', () => {
      const model = predictor.getPredictionModel('nonexistent', 'players');
      
      expect(model).toBeUndefined();
    });
  });

  describe('setAutonomousMode', () => {
    test('should enable autonomous mode', () => {
      predictor.setAutonomousMode(true);
      
      expect(predictor.autonomousMode).toBe(true);
    });

    test('should disable autonomous mode', () => {
      predictor.setAutonomousMode(false);
      
      expect(predictor.autonomousMode).toBe(false);
    });
  });
});

// ============== SeedingPipeline Tests ==============
describe('SeedingPipeline', () => {
  let pipeline;
  let mockParticipants;

  beforeEach(() => {
    pipeline = new SeedingPipeline();
    mockParticipants = [
      { id: 'p1', name: 'Player1', rating: 1800, winRate: 0.7, experience: 10 },
      { id: 'p2', name: 'Player2', rating: 1700, winRate: 0.6, experience: 8 },
      { id: 'p3', name: 'Player3', rating: 1600, winRate: 0.5, experience: 6 },
      { id: 'p4', name: 'Player4', rating: 1500, winRate: 0.4, experience: 4 }
    ];
  });

  describe('buildPipeline', () => {
    test('should execute all pipeline stages', async () => {
      const result = await pipeline.buildPipeline(mockParticipants);
      
      expect(result.success).toBe(true);
      expect(result.stages).toBeDefined();
      expect(result.stages.length).toBe(6); // 6 pipeline stages
    });

    test('should complete within timeout', async () => {
      const result = await pipeline.buildPipeline(mockParticipants, { timeout: 5000 });
      
      expect(result.totalDuration).toBeLessThan(5000);
    });

    test('should include all stage results', async () => {
      const result = await pipeline.buildPipeline(mockParticipants);
      
      const stageNames = result.stages.map(s => s.stage);
      expect(stageNames).toContain('data_validation');
      expect(stageNames).toContain('rating_calculation');
      expect(stageNames).toContain('seed_assignment');
      expect(stageNames).toContain('bracket_generation');
      expect(stageNames).toContain('match_scheduling');
      expect(stageNames).toContain('validation');
    });
  });

  describe('validateParticipantData', () => {
    test('should validate correct participant data', () => {
      const result = pipeline.validateParticipantData(mockParticipants);
      
      expect(result.validated).toBe(4);
      expect(result.validations.every(v => v.valid)).toBe(true);
    });

    test('should reject participant with missing id', () => {
      const invalidParticipants = [
        { name: 'Player1' }
      ];
      
      expect(() => pipeline.validateParticipantData(invalidParticipants)).toThrow();
    });

    test('should reject participant with missing name', () => {
      const invalidParticipants = [
        { id: 'p1' }
      ];
      
      expect(() => pipeline.validateParticipantData(invalidParticipants)).toThrow();
    });

    test('should reject participant with negative rating', () => {
      const invalidParticipants = [
        { id: 'p1', name: 'Player1', rating: -100 }
      ];
      
      expect(() => pipeline.validateParticipantData(invalidParticipants)).toThrow();
    });
  });

  describe('calculateRatings', () => {
    test('should calculate ratings for all participants', () => {
      const result = pipeline.calculateRatings(mockParticipants);
      
      expect(result.length).toBe(4);
      result.forEach(r => {
        expect(r.calculatedRating).toBeDefined();
        expect(r.ratingTier).toBeDefined();
      });
    });

    test('should include win rate bonus in calculation', () => {
      const result = pipeline.calculateRatings(mockParticipants);
      
      // Higher win rate should result in higher calculated rating
      expect(result[0].calculatedRating).toBeGreaterThan(result[1].calculatedRating);
    });

    test('should assign correct rating tiers', () => {
      const participantsWithTiers = [
        { id: 'p1', name: 'Player1', rating: 1900, winRate: 0.7 },
        { id: 'p2', name: 'Player2', rating: 1700, winRate: 0.6 },
        { id: 'p3', name: 'Player3', rating: 1500, winRate: 0.5 },
        { id: 'p4', name: 'Player4', rating: 1300, winRate: 0.4 },
        { id: 'p5', name: 'Player5', rating: 1100, winRate: 0.3 }
      ];
      
      const result = pipeline.calculateRatings(participantsWithTiers);
      
      expect(result[0].ratingTier).toBe('S'); // 1900 rating
      expect(result[1].ratingTier).toBe('A'); // 1700 rating
      expect(result[2].ratingTier).toBe('B'); // 1500 rating
      expect(result[3].ratingTier).toBe('C'); // 1300 rating
      expect(result[4].ratingTier).toBe('D'); // 1100 rating
    });
  });

  describe('assignSeeds', () => {
    test('should assign sequential seeds based on rating', () => {
      const result = pipeline.assignSeeds(mockParticipants);
      
      expect(result[0].seed).toBe(1);
      expect(result[1].seed).toBe(2);
      expect(result[2].seed).toBe(3);
      expect(result[3].seed).toBe(4);
    });

    test('should sort by calculated rating', () => {
      const result = pipeline.assignSeeds(mockParticipants);
      
      // Highest rating should be seed 1
      expect(result[0].rating).toBeGreaterThanOrEqual(result[1].rating);
    });
  });

  describe('generateBracket', () => {
    test('should generate bracket through internal generator', () => {
      const result = pipeline.generateBracket(mockParticipants, { seeds: 4 });
      
      expect(result).toBeDefined();
      expect(result.format).toBeDefined();
      expect(result.rounds).toBeDefined();
      expect(result.totalMatches).toBeDefined();
    });
  });

  describe('scheduleMatches', () => {
    test('should schedule all matches', () => {
      const result = pipeline.scheduleMatches(mockParticipants);
      
      expect(result.matches.length).toBe(2); // 4 participants / 2
      expect(result.totalMatches).toBe(2);
    });

    test('should assign match IDs', () => {
      const result = pipeline.scheduleMatches(mockParticipants);
      
      result.matches.forEach(m => {
        expect(m.id).toBeDefined();
      });
    });

    test('should set first round stage', () => {
      const result = pipeline.scheduleMatches(mockParticipants);
      
      result.matches.forEach(m => {
        expect(m.stage).toBe('round_1');
      });
    });
  });

  describe('calculateMatchTime', () => {
    test('should calculate correct time intervals', () => {
      const time1 = pipeline.calculateMatchTime(0);
      const time2 = pipeline.calculateMatchTime(1);
      
      const diff = time2 - time1;
      expect(diff).toBe(30 * 60 * 1000); // 30 minutes
    });
  });

  describe('validatePipeline', () => {
    test('should pass when all stages completed', () => {
      const result = pipeline.validatePipeline();
      
      expect(result.valid).toBe(true);
      expect(result.stagesCompleted).toBe(pipeline.pipelineStages.length);
    });

    test('should fail when stages have failed', () => {
      // Create a fresh pipeline and add a failing stage
      const failingPipeline = new SeedingPipeline();
      failingPipeline.initializePipeline();
      failingPipeline.addStage('test_stage', () => {
        throw new Error('Stage failed');
      });
      
      // Manually set the stage status to failed
      failingPipeline.pipelineStages[0].status = 'failed';
      
      expect(() => failingPipeline.validatePipeline()).toThrow();
    });
  });

  describe('getPipelineStatus', () => {
    test('should return correct pipeline status', async () => {
      await pipeline.buildPipeline(mockParticipants);
      const status = pipeline.getPipelineStatus();
      
      expect(status.currentStage).toBe(pipeline.pipelineStages.length - 1);
      expect(status.stages).toBeDefined();
      expect(status.log).toBeDefined();
    });
  });

  describe('initializePipeline', () => {
    test('should reset pipeline state', () => {
      pipeline.initializePipeline();
      
      expect(pipeline.pipelineStages.length).toBe(0);
      expect(pipeline.currentStage).toBe(0);
      expect(pipeline.executionLog).toBeDefined();
    });
  });

  describe('addStage', () => {
    test('should add stage to pipeline', () => {
      pipeline.initializePipeline();
      pipeline.addStage('test_stage', () => 'result');
      
      expect(pipeline.pipelineStages.length).toBe(1);
      expect(pipeline.pipelineStages[0].name).toBe('test_stage');
      expect(pipeline.pipelineStages[0].status).toBe('pending');
    });
  });
});

// ============== TournamentSeedingSystem Tests ==============
describe('TournamentSeedingSystem', () => {
  let system;
  let mockParticipants;

  beforeEach(() => {
    system = new TournamentSeedingSystem();
    mockParticipants = [
      { id: 'p1', name: 'Player1', rating: 1800, recentWins: 5 },
      { id: 'p2', name: 'Player2', rating: 1700, recentWins: 4 },
      { id: 'p3', name: 'Player3', rating: 1600, recentWins: 3 },
      { id: 'p4', name: 'Player4', rating: 1500, recentWins: 3 },
      { id: 'p5', name: 'Player5', rating: 1400, recentWins: 2 },
      { id: 'p6', name: 'Player6', rating: 1300, recentWins: 2 },
      { id: 'p7', name: 'Player7', rating: 1200, recentWins: 1 },
      { id: 'p8', name: 'Player8', rating: 1100, recentWins: 1 }
    ];
  });

  describe('createSeeding', () => {
    test('should create complete seeding result', async () => {
      const result = await system.createSeeding(mockParticipants);
      
      expect(result.format).toBeDefined();
      expect(result.seeds).toBeDefined();
      expect(result.pipelineResult).toBeDefined();
      expect(result.predictions).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    test('should record tournament in history', async () => {
      await system.createSeeding(mockParticipants);
      
      const history = system.getTournamentHistory();
      expect(history.length).toBe(1);
    });

    test('should respect options', async () => {
      const result = await system.createSeeding(mockParticipants, {
        format: 'double-elimination',
        seeds: 16,
        autoBalance: false
      });
      
      expect(result.format).toBe('double-elimination');
    });

    test('should limit history size', async () => {
      for (let i = 0; i < 60; i++) {
        await system.createSeeding(mockParticipants);
      }
      
      const history = system.getTournamentHistory();
      expect(history.length).toBe(50); // maxHistorySize
    });
  });

  describe('generatePredictions', () => {
    test('should generate predictions for top 8', async () => {
      const predictions = system.generatePredictions(mockParticipants);
      
      expect(predictions.length).toBeGreaterThan(0);
      expect(predictions.length).toBeLessThanOrEqual(4); // 8 participants / 2 = 4 potential matches
    });

    test('should include all prediction fields', () => {
      const predictions = system.generatePredictions(mockParticipants);
      
      predictions.forEach(p => {
        expect(p.match).toBeDefined();
        expect(p.player1).toBeDefined();
        expect(p.player2).toBeDefined();
        expect(p.player1WinProbability).toBeDefined();
        expect(p.player2WinProbability).toBeDefined();
      });
    });
  });

  describe('predictMatch', () => {
    test('should return prediction for two players', () => {
      const player1 = { id: 'p1', name: 'Player1', rating: 1600 };
      const player2 = { id: 'p2', name: 'Player2', rating: 1500 };
      
      const prediction = system.predictMatch(player1, player2);
      
      expect(prediction).toBeDefined();
      expect(prediction.player1WinProbability).toBeDefined();
      expect(prediction.player2WinProbability).toBeDefined();
    });

    test('should consider context in prediction', () => {
      const player1 = { id: 'p1', name: 'Player1', rating: 1600 };
      const player2 = { id: 'p2', name: 'Player2', rating: 1500 };
      
      const prediction = system.predictMatch(player1, player2, { 
        tournamentContext: 'finals',
        headToHead: [{ winner: 'p1' }]
      });
      
      expect(prediction).toBeDefined();
    });
  });

  describe('getHeadToHead', () => {
    test('should filter correct head to head matches', () => {
      const history = [
        { player1: 'p1', player2: 'p2', winner: 'p1' },
        { player1: 'p2', player2: 'p1', winner: 'p1' },
        { player1: 'p1', player2: 'p3', winner: 'p3' }
      ];
      
      const h2h = system.getHeadToHead('p1', 'p2', history);
      
      expect(h2h.length).toBe(2);
    });

    test('should work regardless of player order', () => {
      const history = [
        { player1: 'p1', player2: 'p2', winner: 'p1' },
        { player1: 'p2', player2: 'p1', winner: 'p2' }
      ];
      
      const h2h = system.getHeadToHead('p2', 'p1', history);
      
      expect(h2h.length).toBe(2);
    });
  });

  describe('generateBracket', () => {
    test('should generate bracket through internal generator', () => {
      const bracket = system.generateBracket(mockParticipants, { seeds: 8 });
      
      expect(bracket.format).toBeDefined();
      expect(bracket.rounds).toBeDefined();
    });
  });

  describe('recordTournament', () => {
    test('should record tournament in history', () => {
      const tournament = { id: 'test', timestamp: Date.now() };
      
      system.recordTournament(tournament);
      
      expect(system.tournamentHistory.length).toBe(1);
      expect(system.tournamentHistory[0]).toEqual(tournament);
    });
  });

  describe('getTournamentHistory', () => {
    test('should return empty array when no history', () => {
      const system2 = new TournamentSeedingSystem();
      const history = system2.getTournamentHistory();
      
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);
    });
  });

  describe('getBracketGenerator', () => {
    test('should return bracket generator instance', () => {
      const generator = system.getBracketGenerator();
      
      expect(generator).toBeInstanceOf(BracketGenerator);
    });
  });

  describe('getMatchPredictor', () => {
    test('should return match predictor instance', () => {
      const predictor = system.getMatchPredictor();
      
      expect(predictor).toBeInstanceOf(MatchPredictor);
    });
  });

  describe('reset', () => {
    test('should clear all internal state', async () => {
      await system.createSeeding(mockParticipants);
      system.recordTournament({ id: 'extra' });
      
      system.reset();
      
      expect(system.tournamentHistory.length).toBe(0);
    });
  });

  describe('constructor options', () => {
    test('should respect maxHistorySize option', async () => {
      const smallSystem = new TournamentSeedingSystem({ maxHistorySize: 5 });
      
      for (let i = 0; i < 10; i++) {
        await smallSystem.createSeeding(mockParticipants);
      }
      
      expect(smallSystem.tournamentHistory.length).toBe(5);
    });
  });
});

// ============== Edge Cases ==============
describe('Tournament Seeding Edge Cases', () => {
  describe('BracketGenerator edge cases', () => {
    let generator;

    beforeEach(() => {
      generator = new BracketGenerator();
    });

    test('should handle empty participant list', () => {
      const result = generator.collaborativeGenerate([], { seeds: 8 });
      
      expect(result.participants).toBe(0);
      expect(result.rounds).toBeDefined();
    });

    test('should handle single participant', () => {
      const result = generator.collaborativeGenerate([{ id: 'p1', name: 'Player1' }], { seeds: 4 });
      
      expect(result.participants).toBe(1);
      expect(result.rounds).toBeDefined();
    });

    test('should handle odd number of participants', () => {
      const participants = [
        { id: 'p1', name: 'Player1', rating: 1600 },
        { id: 'p2', name: 'Player2', rating: 1500 },
        { id: 'p3', name: 'Player3', rating: 1400 }
      ];
      
      const result = generator.collaborativeGenerate(participants, { seeds: 4 });
      
      expect(result.participants).toBe(3);
      expect(result.rounds).toBeDefined();
    });
  });

  describe('MatchPredictor edge cases', () => {
    let predictor;

    beforeEach(() => {
      predictor = new MatchPredictor();
    });

    test('should handle players with no rating', () => {
      const player1 = { id: 'p1', name: 'Player1' };
      const player2 = { id: 'p2', name: 'Player2' };
      
      const prediction = predictor.autonomousPredict(player1, player2);
      
      expect(prediction).toBeDefined();
      expect(prediction.player1WinProbability + prediction.player2WinProbability).toBeCloseTo(1, 2);
    });

    test('should handle players with equal rating', () => {
      const player1 = { id: 'p1', name: 'Player1', rating: 1500 };
      const player2 = { id: 'p2', name: 'Player2', rating: 1500 };
      
      const prediction = predictor.autonomousPredict(player1, player2);
      
      // With equal ratings, form difference should determine winner
      expect(prediction).toBeDefined();
    });

    test('should handle extreme rating differences', () => {
      const player1 = { id: 'p1', name: 'Player1', rating: 3000 };
      const player2 = { id: 'p2', name: 'Player2', rating: 500 };
      
      const prediction = predictor.autonomousPredict(player1, player2);
      
      expect(prediction.player1WinProbability).toBeGreaterThan(0.5);
      expect(prediction.expectedWinner).toBe('player1');
    });
  });

  describe('SeedingPipeline edge cases', () => {
    let pipeline;

    beforeEach(() => {
      pipeline = new SeedingPipeline();
    });

    test('should handle empty participant list', async () => {
      const result = await pipeline.buildPipeline([]);
      
      expect(result.success).toBe(true);
    });

    test('should handle custom pipeline configuration', async () => {
      const customPipeline = new SeedingPipeline();
      customPipeline.pipelineConfig.maxConcurrency = 8;
      customPipeline.pipelineConfig.timeout = 10000;
      
      const result = await customPipeline.buildPipeline([
        { id: 'p1', name: 'Player1', rating: 1600 }
      ]);
      
      expect(result.success).toBe(true);
    });
  });

  describe('TournamentSeedingSystem edge cases', () => {
    let system;

    beforeEach(() => {
      system = new TournamentSeedingSystem();
    });

    test('should handle empty seeding creation', async () => {
      const result = await system.createSeeding([]);
      
      expect(result).toBeDefined();
      expect(result.predictions).toBeDefined();
    });

    test('should predict match with empty context', () => {
      const prediction = system.predictMatch(
        { id: 'p1', name: 'Player1' },
        { id: 'p2', name: 'Player2' },
        {}
      );
      
      expect(prediction).toBeDefined();
    });

    test('should generate bracket with custom options', () => {
      const bracket = system.generateBracket([], {
        format: 'round-robin',
        seeds: 4,
        autoBalance: false
      });
      
      expect(bracket).toBeDefined();
    });
  });
});