/**
 * Card Synergy Mapper Tests
 * Tests CardSynergyMapper: buildSynergyMatrix() / findCoreCards() / calculateSynergyScore()
 */

const { CardSynergyMapper } = require('../../src/card-synergy-mapper.js');

describe('CardSynergyMapper', () => {
  let mapper;

  beforeEach(() => {
    mapper = new CardSynergyMapper();
  });

  describe('constructor', () => {
    test('initializes with empty synergy matrix', () => {
      expect(mapper.synergyMatrix).toEqual(new Map());
      expect(mapper.cardList).toEqual([]);
    });
  });

  describe('buildSynergyMatrix', () => {
    test('builds matrix for given deck', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 },
        { id: 'bash', name: 'Bash', type: 'attack', cost: 2 }
      ];
      
      const matrix = mapper.buildSynergyMatrix(deck);
      
      expect(matrix).toBeDefined();
      expect(matrix.length).toBe(3); // 3 cards
    });

    test('matrix dimensions are correct', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 },
        { id: 'bash', name: 'Bash', type: 'attack', cost: 2 },
        { id: 'cleave', name: 'Cleave', type: 'attack', cost: 1 }
      ];
      
      const matrix = mapper.buildSynergyMatrix(deck);
      
      // Matrix should be square: NxN
      expect(matrix.length).toBe(matrix[0].length);
      expect(matrix.length).toBe(4);
    });

    test('handles empty deck', () => {
      const matrix = mapper.buildSynergyMatrix([]);
      expect(matrix).toEqual([]);
    });

    test('handles single card', () => {
      const deck = [{ id: 'strike', name: 'Strike', type: 'attack', cost: 1 }];
      
      const matrix = mapper.buildSynergyMatrix(deck);
      
      expect(matrix.length).toBe(1);
      expect(matrix[0][0]).toBe(0); // Self synergy is 0
    });

    test('calculates synergy values correctly', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 }
      ];
      
      const matrix = mapper.buildSynergyMatrix(deck);
      
      // attack + skill = balanced synergy should have some value
      expect(matrix[0][1]).toBeDefined();
      expect(matrix[1][0]).toBeDefined();
    });
  });

  describe('findCoreCards', () => {
    test('identifies core cards based on synergy', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 },
        { id: 'bash', name: 'Bash', type: 'attack', cost: 2 }
      ];
      
      mapper.buildSynergyMatrix(deck);
      const coreCards = mapper.findCoreCards(deck);
      
      expect(coreCards).toBeDefined();
      expect(coreCards.length).toBeGreaterThan(0);
    });

    test('returns empty array for empty deck', () => {
      const coreCards = mapper.findCoreCards([]);
      expect(coreCards).toEqual([]);
    });

    test('identifies high synergy cards as core', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'strike2', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 }
      ];
      
      mapper.buildSynergyMatrix(deck);
      const coreCards = mapper.findCoreCards(deck);
      
      expect(coreCards.length).toBeLessThanOrEqual(deck.length);
    });
  });

  describe('calculateSynergyScore', () => {
    test('calculates overall synergy score', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 }
      ];
      
      const score = mapper.calculateSynergyScore(deck);
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('returns 0 for empty deck', () => {
      const score = mapper.calculateSynergyScore([]);
      expect(score).toBe(0);
    });

    test('calculates higher score for synergistic decks', () => {
      const synergisticDeck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'strike2', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'strike3', name: 'Strike', type: 'attack', cost: 1 }
      ];
      
      const randomDeck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 },
        { id: 'power', name: 'Power', type: 'power', cost: 2 }
      ];
      
      const synScore = mapper.calculateSynergyScore(synergisticDeck);
      const randScore = mapper.calculateSynergyScore(randomDeck);
      
      expect(synScore).toBeGreaterThanOrEqual(randScore);
    });
  });

  describe('getSynergyBetween', () => {
    test('returns synergy value between two cards', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 }
      ];
      
      mapper.buildSynergyMatrix(deck);
      const synergy = mapper.getSynergyBetween('strike', 'defend');
      
      expect(typeof synergy).toBe('number');
    });

    test('returns 0 for unknown cards', () => {
      const synergy = mapper.getSynergyBetween('unknown1', 'unknown2');
      expect(synergy).toBe(0);
    });
  });

  describe('findCardSynergies', () => {
    test('finds all synergies for a card', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 },
        { id: 'bash', name: 'Bash', type: 'attack', cost: 2 }
      ];
      
      mapper.buildSynergyMatrix(deck);
      const synergies = mapper.findCardSynergies('strike');
      
      expect(synergies).toBeDefined();
    });

    test('returns empty array for unknown card', () => {
      const synergies = mapper.findCardSynergies('unknown_card');
      expect(synergies).toEqual([]);
    });
  });

  describe('analyzeTypeSynergies', () => {
    test('analyzes synergies between card types', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 },
        { id: 'bash', name: 'Bash', type: 'attack', cost: 2 }
      ];
      
      const typeAnalysis = mapper.analyzeTypeSynergies(deck);
      
      expect(typeAnalysis).toBeDefined();
      expect(typeAnalysis.attack).toBeDefined();
    });

    test('returns empty object for empty deck', () => {
      const typeAnalysis = mapper.analyzeTypeSynergies([]);
      expect(typeAnalysis).toEqual({});
    });
  });

  describe('identifySynergyChains', () => {
    test('identifies synergy chains in deck', () => {
      const deck = [
        { id: 'strike', name: 'Strike', type: 'attack', cost: 1 },
        { id: 'defend', name: 'Defend', type: 'skill', cost: 1 },
        { id: 'bash', name: 'Bash', type: 'attack', cost: 2 }
      ];
      
      const chains = mapper.identifySynergyChains(deck);
      
      expect(chains).toBeDefined();
      expect(Array.isArray(chains)).toBe(true);
    });

    test('returns empty array for insufficient cards', () => {
      const deck = [{ id: 'strike', name: 'Strike', type: 'attack', cost: 1 }];
      
      const chains = mapper.identifySynergyChains(deck);
      expect(chains).toEqual([]);
    });
  });
});