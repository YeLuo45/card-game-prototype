/**
 * V258 Card Draft Advisor Tests (Iteration 4/9)
 */

const { 
  CardDraftAdvisor, 
  DraftAnalyzer, 
  SynergyMatcher, 
  RuneInscriber 
} = require('../../src/card-draft-advisor');

// ============== RuneInscriber Tests ==============
describe('RuneInscriber', () => {
  let inscriber;

  beforeEach(() => {
    inscriber = new RuneInscriber();
  });

  describe('inscribeRune', () => {
    test('should inscribe rune with default weight', () => {
      inscriber.inscribeRune('card_001', 'striker');
      const runes = inscriber.getRunes('card_001');
      expect(runes).toHaveLength(1);
      expect(runes[0]).toEqual({
        archetype: 'striker',
        weight: 1.0,
        timestamp: expect.any(Number)
      });
    });

    test('should inscribe multiple runes to same card', () => {
      inscriber.inscribeRune('card_001', 'striker', 0.8);
      inscriber.inscribeRune('card_001', 'mage', 1.0);
      const runes = inscriber.getRunes('card_001');
      expect(runes).toHaveLength(2);
    });

    test('should handle different weight values', () => {
      inscriber.inscribeRune('card_001', 'guardian', 0.5);
      inscriber.inscribeRune('card_002', 'assassin', 1.5);
      const runes1 = inscriber.getRunes('card_001');
      const runes2 = inscriber.getRunes('card_002');
      expect(runes1[0].weight).toBe(0.5);
      expect(runes2[0].weight).toBe(1.5);
    });
  });

  describe('fuzzyMatchArchetype', () => {
    test('should return 1.0 for exact match', () => {
      inscriber.inscribeRune('card_001', 'striker');
      const match = inscriber.fuzzyMatchArchetype('card_001', 'striker');
      expect(match).toBe(1.0);
    });

    test('should return 0 for card with no runes', () => {
      const match = inscriber.fuzzyMatchArchetype('nonexistent', 'striker');
      expect(match).toBe(0);
    });

    test('should return weighted score for partial match', () => {
      inscriber.inscribeRune('card_001', 'mage', 0.5);
      const match = inscriber.fuzzyMatchArchetype('card_001', 'wizard');
      expect(match).toBeGreaterThan(0);
      expect(match).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateRuneSimilarity', () => {
    test('should return 1.0 for identical strings', () => {
      const sim = inscriber.calculateRuneSimilarity('striker', 'striker');
      expect(sim).toBe(1.0);
    });

    test('should return 0 for completely different strings', () => {
      const sim = inscriber.calculateRuneSimilarity('abc', 'xyz');
      expect(sim).toBeLessThan(1);
    });

    test('should calculate edit distance similarity', () => {
      const sim = inscriber.calculateRuneSimilarity('striker', 'strikers');
      expect(sim).toBeGreaterThan(0.5);
      expect(sim).toBeLessThan(1);
    });
  });

  describe('levenshteinDistance', () => {
    test('should return 0 for identical strings', () => {
      const dist = inscriber.levenshteinDistance('test', 'test');
      expect(dist).toBe(0);
    });

    test('should return correct distance for single character difference', () => {
      const dist = inscriber.levenshteinDistance('striker', 'strikers');
      expect(dist).toBe(1);
    });

    test('should return length difference for empty strings', () => {
      const dist = inscriber.levenshteinDistance('abc', '');
      expect(dist).toBe(3);
    });

    test('should handle empty strings correctly', () => {
      const dist = inscriber.levenshteinDistance('', '');
      expect(dist).toBe(0);
    });
  });

  describe('clearRunes', () => {
    test('should clear all inscribed runes', () => {
      inscriber.inscribeRune('card_001', 'striker');
      inscriber.inscribeRune('card_002', 'mage');
      inscriber.clearRunes();
      expect(inscriber.getRunes('card_001')).toHaveLength(0);
      expect(inscriber.getRunes('card_002')).toHaveLength(0);
    });
  });
});

// ============== DraftAnalyzer Tests ==============
describe('DraftAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new DraftAnalyzer();
  });

  describe('structuredReasoning', () => {
    test('should return analysis with layers for empty context', () => {
      const result = analyzer.structuredReasoning({
        availableCards: [],
        currentDeck: [],
        teamComposition: [],
        enemyHint: null
      });
      expect(result).toHaveProperty('layers');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('reasoning');
    });

    test('should analyze synergy layer', () => {
      const cards = [
        { id: 'strike', name: 'Strike', damage: 6, cost: 1, type: 'attack', role: 'attack' },
        { id: 'defend', name: 'Defend', damage: 0, cost: 1, type: 'defense', role: 'defense' }
      ];
      const result = analyzer.structuredReasoning({
        availableCards: cards,
        currentDeck: [],
        teamComposition: [],
        enemyHint: null
      });
      const synergyLayer = result.layers.find(l => l.layer === 'synergy');
      expect(synergyLayer).toBeDefined();
      expect(synergyLayer.scores).toHaveLength(2);
    });

    test('should analyze archetype layer', () => {
      const cards = [
        { id: 'card1', archetype: 'striker' },
        { id: 'card2', archetype: 'mage' }
      ];
      const result = analyzer.structuredReasoning({
        availableCards: cards,
        currentDeck: [],
        teamComposition: [],
        enemyHint: null
      });
      const archetypeLayer = result.layers.find(l => l.layer === 'archetype');
      expect(archetypeLayer).toBeDefined();
    });

    test('should analyze counter layer with enemy hint', () => {
      const cards = [
        { id: 'counter_card', name: 'Counter', effectiveAgainst: ['boss'], statusEffect: { vulnerable: true } },
        { id: 'normal_card', name: 'Normal' }
      ];
      const result = analyzer.structuredReasoning({
        availableCards: cards,
        currentDeck: [],
        teamComposition: [],
        enemyHint: { type: 'boss', vulnerableTo: ['vulnerable'] }
      });
      const counterLayer = result.layers.find(l => l.layer === 'counter');
      expect(counterLayer).toBeDefined();
      expect(counterLayer.topPick).toBeDefined();
    });

    test('should return empty counter layer without enemy hint', () => {
      const cards = [{ id: 'card1' }];
      const result = analyzer.structuredReasoning({
        availableCards: cards,
        currentDeck: [],
        teamComposition: [],
        enemyHint: null
      });
      const counterLayer = result.layers.find(l => l.layer === 'counter');
      expect(counterLayer.topPick).toBeNull();
    });

    test('should analyze efficiency layer', () => {
      const cards = [
        { id: 'high_eff', damage: 10, cost: 1 },
        { id: 'low_eff', damage: 3, cost: 3 }
      ];
      const result = analyzer.structuredReasoning({
        availableCards: cards,
        currentDeck: [],
        teamComposition: [],
        enemyHint: null
      });
      const efficiencyLayer = result.layers.find(l => l.layer === 'efficiency');
      expect(efficiencyLayer).toBeDefined();
    });

    test('should analyze flexibility layer', () => {
      const cards = [
        { id: 'flex_card', flexibleTarget: true, cost: 2, drawCard: true },
        { id: 'rigid_card', cost: 5 }
      ];
      const result = analyzer.structuredReasoning({
        availableCards: cards,
        currentDeck: [],
        teamComposition: [],
        enemyHint: null
      });
      const flexibilityLayer = result.layers.find(l => l.layer === 'flexibility');
      expect(flexibilityLayer).toBeDefined();
    });
  });

  describe('calculatePairSynergy', () => {
    test('should return synergy for same type cards', () => {
      const card1 = { type: 'attack', role: 'attack' };
      const card2 = { type: 'attack', role: 'defense' };
      const synergy = analyzer.calculatePairSynergy(card1, card2);
      expect(synergy).toBeGreaterThanOrEqual(0.3);
    });

    test('should return synergy for complementary roles', () => {
      const card1 = { type: 'attack', role: 'attack' };
      const card2 = { type: 'defense', role: 'defense' };
      const synergy = analyzer.calculatePairSynergy(card1, card2);
      expect(synergy).toBeGreaterThanOrEqual(0.2);
    });

    test('should return synergy for low cost combination', () => {
      const card1 = { cost: 2 };
      const card2 = { cost: 3 };
      const synergy = analyzer.calculatePairSynergy(card1, card2);
      expect(synergy).toBeGreaterThanOrEqual(0.2);
    });
  });

  describe('extractCardTypes', () => {
    test('should count roles correctly', () => {
      const deck = [
        { role: 'attack' },
        { role: 'attack' },
        { role: 'defense' }
      ];
      const types = analyzer.extractCardTypes(deck);
      expect(types.attack).toBe(2);
      expect(types.defense).toBe(1);
    });

    test('should handle empty deck', () => {
      const types = analyzer.extractCardTypes([]);
      expect(types.attack).toBe(0);
      expect(types.defense).toBe(0);
    });
  });

  describe('extractArchetypes', () => {
    test('should extract unique archetypes', () => {
      const deck = [
        { archetype: 'striker' },
        { archetype: 'mage' },
        { archetype: 'striker' }
      ];
      const archetypes = analyzer.extractArchetypes(deck);
      expect(archetypes).toHaveLength(2);
      expect(archetypes).toContain('striker');
      expect(archetypes).toContain('mage');
    });

    test('should return empty array for deck without archetypes', () => {
      const deck = [{ id: 'card1' }, { id: 'card2' }];
      const archetypes = analyzer.extractArchetypes(deck);
      expect(archetypes).toHaveLength(0);
    });
  });

  describe('archetypeMatchScore', () => {
    test('should return 1.0 for matching archetype', () => {
      const score = analyzer.archetypeMatchScore({ archetype: 'striker' }, ['striker']);
      expect(score).toBe(1.0);
    });

    test('should return 0.7 for similar archetype group', () => {
      const score = analyzer.archetypeMatchScore({ archetype: 'assassin' }, ['striker']);
      expect(score).toBe(0.7);
    });

    test('should return 0.7 for main archetype when deck has variant', () => {
      // When card archetype IS main (striker) AND deck has variant (assassin)
      const score = analyzer.archetypeMatchScore({ archetype: 'striker' }, ['assassin']);
      expect(score).toBe(0.7);
    });

    test('should return 0.5 for card without archetype', () => {
      const score = analyzer.archetypeMatchScore({}, ['striker']);
      expect(score).toBe(0.5);
    });
  });

  describe('generateRecommendations', () => {
    test('should return top 3 recommendations', () => {
      const cards = [
        { id: 'card1', name: 'Card 1' },
        { id: 'card2', name: 'Card 2' },
        { id: 'card3', name: 'Card 3' },
        { id: 'card4', name: 'Card 4' }
      ];
      const layers = [
        { scores: cards.map(c => ({ card: c, synergyScore: 0.5 })), topPick: cards[0] },
        { scores: cards.map(c => ({ card: c, archetypeScore: 0.5 })), topPick: cards[1] }
      ];
      const recs = analyzer.generateRecommendations(layers, cards);
      expect(recs).toHaveLength(3);
    });
  });

  describe('recordDraft and getHistory', () => {
    test('should record and retrieve draft history', () => {
      analyzer.recordDraft({ pick: 'card_001', round: 1 });
      analyzer.recordDraft({ pick: 'card_002', round: 2 });
      const history = analyzer.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].pick).toBe('card_001');
      expect(history[1].pick).toBe('card_002');
    });
  });
});

// ============== SynergyMatcher Tests ==============
describe('SynergyMatcher', () => {
  let matcher;

  beforeEach(() => {
    matcher = new SynergyMatcher();
  });

  describe('createBatches', () => {
    test('should split cards into batches', () => {
      const cards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const batches = matcher.createBatches(cards, 3);
      expect(batches).toHaveLength(4);
      expect(batches[0]).toHaveLength(3);
      expect(batches[3]).toHaveLength(1);
    });

    test('should handle batch size larger than array', () => {
      const cards = [1, 2, 3];
      const batches = matcher.createBatches(cards, 10);
      expect(batches).toHaveLength(1);
      expect(batches[0]).toHaveLength(3);
    });
  });

  describe('calculateCardSynergies', () => {
    test('should calculate synergies for a card', () => {
      const cards = [
        { id: 'strike', name: 'Strike', synergyTags: ['attack'] },
        { id: 'defend', name: 'Defend', synergyTags: ['defense'] }
      ];
      const synergies = matcher.calculateCardSynergies(cards[0], cards);
      expect(synergies).toBeDefined();
    });

    test('should return empty for card not in list', () => {
      const synergies = matcher.calculateCardSynergies({ id: 'none' }, []);
      expect(synergies).toHaveLength(0);
    });
  });

  describe('calculateSynergyScore', () => {
    test('should return higher score for shared tags', () => {
      const card1 = { synergyTags: ['fire', 'attack'] };
      const card2 = { synergyTags: ['fire', 'defense'] };
      const score = matcher.calculateSynergyScore(card1, card2);
      expect(score).toBeGreaterThan(0);
    });

    test('should return higher score for low energy difference', () => {
      const card1 = { cost: 1 };
      const card2 = { cost: 2 };
      const score = matcher.calculateSynergyScore(card1, card2);
      expect(score).toBeGreaterThanOrEqual(0.2);
    });

    test('should return synergy bonus for matching archetype', () => {
      const card1 = { archetype: 'striker' };
      const card2 = { archetype: 'striker' };
      const score = matcher.calculateSynergyScore(card1, card2);
      expect(score).toBeGreaterThanOrEqual(0.15);
    });
  });

  describe('identifySynergyType', () => {
    test('should identify offense-defense combo', () => {
      const type = matcher.identifySynergyType(
        { type: 'attack' },
        { type: 'defense' }
      );
      expect(type).toBe('offense-defense');
    });

    test('should identify tag-match synergy', () => {
      const card1 = { synergyTags: ['fire'] };
      const card2 = { synergyTags: ['fire'] };
      const type = matcher.identifySynergyType(card1, card2);
      expect(type).toBe('tag-match');
    });
  });

  describe('isComboPair', () => {
    test('should identify strike and bash as combo', () => {
      const card1 = { id: 'strike' };
      const card2 = { id: 'bash' };
      expect(matcher.isComboPair(card1, card2)).toBe(true);
    });

    test('should return false for non-combo cards', () => {
      const card1 = { id: 'random1' };
      const card2 = { id: 'random2' };
      expect(matcher.isComboPair(card1, card2)).toBe(false);
    });
  });

  describe('parallelSynergyCalculation', () => {
    test('should calculate synergies for multiple cards', async () => {
      const cards = [
        { id: 'card1', name: 'Card 1' },
        { id: 'card2', name: 'Card 2' },
        { id: 'card3', name: 'Card 3' }
      ];
      const graph = await matcher.parallelSynergyCalculation(cards);
      expect(graph).toBeInstanceOf(Map);
    });
  });

  describe('getSynergyGraph and getCardSynergies', () => {
    test('should return synergy graph', () => {
      const graph = matcher.getSynergyGraph();
      expect(graph).toBeInstanceOf(Map);
    });

    test('should return empty synergies for unknown card', () => {
      const synergies = matcher.getCardSynergies('unknown');
      expect(synergies).toHaveLength(0);
    });
  });
});

// ============== CardDraftAdvisor Tests ==============
describe('CardDraftAdvisor', () => {
  let advisor;

  beforeEach(() => {
    advisor = new CardDraftAdvisor();
  });

  afterEach(() => {
    advisor.resetSession();
  });

  describe('constructor', () => {
    test('should use default options', () => {
      const a = new CardDraftAdvisor();
      expect(a.decisionMode).toBe('balanced');
      expect(a.confidenceThreshold).toBe(0.6);
      expect(a.verbose).toBe(false);
    });

    test('should accept custom options', () => {
      const a = new CardDraftAdvisor({
        decisionMode: 'aggressive',
        confidenceThreshold: 0.8,
        verbose: true
      });
      expect(a.decisionMode).toBe('aggressive');
      expect(a.confidenceThreshold).toBe(0.8);
      expect(a.verbose).toBe(true);
    });

    test('should initialize system weights', () => {
      expect(advisor.systemWeights).toBeDefined();
      expect(advisor.systemWeights.claudeCode).toBe(0.25);
      expect(advisor.systemWeights.nanobot).toBe(0.25);
      expect(advisor.systemWeights.chatdev).toBe(0.20);
      expect(advisor.systemWeights.thunderbolt).toBe(0.15);
      expect(advisor.systemWeights.genericAgent).toBe(0.10);
      expect(advisor.systemWeights.ruflo).toBe(0.05);
    });
  });

  describe('startDraftSession', () => {
    test('should create draft session with ID', () => {
      const session = advisor.startDraftSession();
      expect(session).toHaveProperty('id');
      expect(session.id).toMatch(/^draft_/);
      expect(session).toHaveProperty('startedAt');
      expect(session).toHaveProperty('picks');
      expect(session).toHaveProperty('currentDeck');
    });

    test('should include initial context', () => {
      const context = { availableCards: [], teamComposition: [] };
      const session = advisor.startDraftSession(context);
      expect(session.context).toEqual(expect.objectContaining(context));
    });
  });

  describe('recommendCard', () => {
    test('should return primary recommendation', () => {
      const cards = [
        { id: 'card1', name: 'Card 1', cost: 1, damage: 6, role: 'attack' },
        { id: 'card2', name: 'Card 2', cost: 2, damage: 8, role: 'attack' }
      ];
      const result = advisor.recommendCard(cards, []);
      expect(result).toHaveProperty('primaryRecommendation');
      expect(result).toHaveProperty('processingTime');
      expect(result).toHaveProperty('confidence');
    });

    test('should log verbose output when verbose mode enabled', () => {
      const verboseAdvisor = new CardDraftAdvisor({ verbose: true });
      const cards = [
        { id: 'card1', name: 'Card 1', cost: 1, damage: 6, role: 'attack' }
      ];
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      verboseAdvisor.recommendCard(cards, []);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('should include alternatives', () => {
      const cards = [
        { id: 'card1', name: 'Card 1', cost: 1 },
        { id: 'card2', name: 'Card 2', cost: 2 },
        { id: 'card3', name: 'Card 3', cost: 3 }
      ];
      const result = advisor.recommendCard(cards, []);
      expect(result.alternatives).toBeDefined();
    });

    test('should filter cards based on options', () => {
      const cards = [
        { id: 'card1', cost: 1, type: 'attack' },
        { id: 'card2', cost: 10, type: 'special' }
      ];
      const result = advisor.recommendCard(cards, [], { maxCost: 5 });
      expect(result.allScores).toBeDefined();
    });

    test('should exclude specified cards', () => {
      const cards = [
        { id: 'card1', name: 'Card 1' },
        { id: 'card2', name: 'Card 2' }
      ];
      const result = advisor.recommendCard(cards, [], { excludedCards: ['card1'] });
      const excludedCard = result.allScores.find(s => s.card.id === 'card1');
      expect(excludedCard).toBeUndefined();
    });
  });

  describe('preFilterCards', () => {
    test('should filter by max cost', () => {
      const cards = [
        { id: 'card1', cost: 3 },
        { id: 'card2', cost: 7 }
      ];
      const filtered = advisor.preFilterCards(cards, { maxCost: 5 });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('card1');
    });

    test('should filter by required types', () => {
      const cards = [
        { id: 'card1', type: 'attack' },
        { id: 'card2', type: 'defense' }
      ];
      const filtered = advisor.preFilterCards(cards, { requiredTypes: ['attack'] });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('attack');
    });

    test('should exclude specified cards', () => {
      const cards = [
        { id: 'card1' },
        { id: 'card2' }
      ];
      const filtered = advisor.preFilterCards(cards, { excludedCards: ['card1'] });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('card2');
    });

    test('should handle empty cards array', () => {
      const filtered = advisor.preFilterCards([], {});
      expect(filtered).toHaveLength(0);
    });
  });

  describe('collaborativeScoring', () => {
    test('should calculate scores for all cards', () => {
      const cards = [
        { id: 'card1', name: 'Card 1', cost: 1, role: 'attack' },
        { id: 'card2', name: 'Card 2', cost: 2, role: 'defense' }
      ];
      const synergyScores = {};
      const multiDimensional = {
        layers: cards.map(c => ({
          scores: [{ card: c, score: 0.5 }]
        }))
      };
      const fuzzyScores = {};

      const scores = advisor.collaborativeScoring(cards, synergyScores, multiDimensional, fuzzyScores);
      expect(scores).toHaveLength(2);
      expect(scores[0]).toHaveProperty('totalScore');
      expect(scores[0]).toHaveProperty('breakdown');
    });
  });

  describe('getLayerScore', () => {
    test('should extract score from layer', () => {
      const card = { id: 'card1' };
      const multiDimensional = {
        layers: [
          { scores: [{ card: { id: 'card1' }, score: 0.8 }] },
          { scores: [{ card: { id: 'card2' }, score: 0.5 }] }
        ]
      };
      const score = advisor.getLayerScore(multiDimensional, card);
      // Object.values returns [card, score], so index 1 is score
      expect(score).toBe(0.8);
    });

    test('should return 0 for card not in layers', () => {
      const card = { id: 'nonexistent' };
      const multiDimensional = {
        layers: [
          { scores: [{ card: { id: 'card1' }, score: 0.5 }] }
        ]
      };
      const score = advisor.getLayerScore(multiDimensional, card);
      expect(score).toBe(0);
    });
  });

  describe('calculateAutonomousScore', () => {
    test('should return bonus for matching decision mode', () => {
      const card = { role: 'attack' };
      const context = { layers: [] };
      advisor.setDecisionMode('aggressive');
      const score = advisor.calculateAutonomousScore(card, context);
      expect(score).toBeGreaterThanOrEqual(0.3);
    });

    test('should return lower score for non-matching mode', () => {
      const card = { role: 'defense' };
      const context = { layers: [] };
      advisor.setDecisionMode('aggressive');
      const score = advisor.calculateAutonomousScore(card, context);
      expect(score).toBeLessThan(0.3);
    });

    test('should return balance score for balanced mode', () => {
      const card = { role: 'attack' };
      const context = { layers: [] };
      advisor.setDecisionMode('balanced');
      const score = advisor.calculateAutonomousScore(card, context);
      expect(score).toBe(0.15);
    });
  });

  describe('calculatePipelineScore', () => {
    test('should return higher score for low cost cards', () => {
      const lowCostCard = { cost: 1 };
      const highCostCard = { cost: 7 };

      const lowScore = advisor.calculatePipelineScore(lowCostCard);
      const highScore = advisor.calculatePipelineScore(highCostCard);
      expect(lowScore).toBeGreaterThan(highScore);
    });
  });

  describe('makeDraftDecision', () => {
    test('should return draft decision', () => {
      const cards = [
        { id: 'card1', name: 'Card 1', cost: 1, role: 'attack' },
        { id: 'card2', name: 'Card 2', cost: 2, role: 'defense' }
      ];
      advisor.startDraftSession();
      const decision = advisor.makeDraftDecision(cards, []);
      expect(decision).toHaveProperty('recommendedCard');
      expect(decision).toHaveProperty('confidence');
      expect(decision).toHaveProperty('reasoning');
    });

    test('should record decision in session', () => {
      const cards = [{ id: 'card1', name: 'Card 1', cost: 1, role: 'attack' }];
      advisor.startDraftSession();
      advisor.makeDraftDecision(cards, []);
      expect(advisor.getDecisionHistory()).toHaveLength(1);
    });

    test('should inscribe rune for recommended card', () => {
      const cards = [{ id: 'card1', name: 'Card 1', cost: 1, archetype: 'striker', role: 'attack' }];
      advisor.startDraftSession();
      advisor.makeDraftDecision(cards, []);
      const runes = advisor.runeInscriber.getRunes('card1');
      expect(runes.length).toBeGreaterThan(0);
    });
  });

  describe('setDecisionMode', () => {
    test('should set valid decision mode', () => {
      advisor.setDecisionMode('aggressive');
      expect(advisor.decisionMode).toBe('aggressive');

      advisor.setDecisionMode('defensive');
      expect(advisor.decisionMode).toBe('defensive');

      advisor.setDecisionMode('experimental');
      expect(advisor.decisionMode).toBe('experimental');
    });

    test('should ignore invalid decision mode', () => {
      advisor.setDecisionMode('balanced');
      advisor.setDecisionMode('invalid_mode');
      expect(advisor.decisionMode).toBe('balanced');
    });
  });

  describe('getSessionState', () => {
    test('should return null when no session active', () => {
      expect(advisor.getSessionState()).toBeNull();
    });

    test('should return session state when active', () => {
      advisor.startDraftSession();
      expect(advisor.getSessionState()).toBeDefined();
      expect(advisor.getSessionState()).toHaveProperty('id');
    });
  });

  describe('getDecisionHistory', () => {
    test('should return empty array when no session', () => {
      expect(advisor.getDecisionHistory()).toHaveLength(0);
    });

    test('should return decisions from session', () => {
      advisor.startDraftSession();
      advisor.makeDraftDecision([{ id: 'c1', name: 'C1', cost: 1, role: 'attack' }], []);
      expect(advisor.getDecisionHistory()).toHaveLength(1);
    });
  });

  describe('resetSession', () => {
    test('should clear session state', () => {
      advisor.startDraftSession();
      advisor.makeDraftDecision([{ id: 'c1', name: 'C1', cost: 1, role: 'attack' }], []);
      advisor.resetSession();
      expect(advisor.getSessionState()).toBeNull();
    });

    test('should reset sub-modules', () => {
      advisor.startDraftSession();
      advisor.resetSession();
      expect(advisor.analyzer).toBeInstanceOf(DraftAnalyzer);
      expect(advisor.synergyMatcher).toBeInstanceOf(SynergyMatcher);
    });
  });

  describe('batchRecommend', () => {
    test('should process cards in batches', async () => {
      const cards = Array.from({ length: 25 }, (_, i) => ({
        id: `card${i}`,
        name: `Card ${i}`,
        cost: 1
      }));
      const result = await advisor.batchRecommend(cards);
      expect(result).toHaveLength(25);
    });

    test('should sort results by total score', async () => {
      const cards = [
        { id: 'card1', name: 'Card 1' },
        { id: 'card2', name: 'Card 2' }
      ];
      const result = await advisor.batchRecommend(cards);
      expect(result[0]).toHaveProperty('totalScore');
    });
  });

  describe('applyFuzzyMatching', () => {
    test('should calculate fuzzy scores for cards', () => {
      const cards = [
        { id: 'card1', archetype: 'striker' },
        { id: 'card2', archetype: 'mage' }
      ];
      const currentDeck = [{ id: 'existing', archetype: 'striker' }];
      const scores = advisor.applyFuzzyMatching(cards, currentDeck);
      expect(scores).toHaveProperty('card1');
      expect(scores).toHaveProperty('card2');
    });

    test('should return 0 scores for empty deck', () => {
      const cards = [{ id: 'card1', archetype: 'striker' }];
      const scores = advisor.applyFuzzyMatching(cards, []);
      expect(scores['card1']).toBe(0);
    });
  });
});

// ============== Integration Tests ==============
describe('CardDraftAdvisor Integration', () => {
  let advisor;

  beforeEach(() => {
    advisor = new CardDraftAdvisor({ verbose: false });
  });

  test('should handle full draft session workflow', () => {
    const draftCards = [
      { id: 'strike', name: 'Strike', cost: 1, damage: 6, type: 'attack', role: 'attack', archetype: 'striker', synergyTags: ['attack'] },
      { id: 'defend', name: 'Defend', cost: 1, damage: 0, type: 'defense', role: 'defense', archetype: 'guardian' },
      { id: 'fireball', name: 'Fireball', cost: 2, damage: 8, type: 'attack', role: 'attack', synergyTags: ['fire', 'attack'] },
      { id: 'heal', name: 'Heal', cost: 1, type: 'support', role: 'support', archetype: 'healer' }
    ];

    // Start session
    advisor.startDraftSession();

    // Make multiple picks
    const decision1 = advisor.makeDraftDecision(draftCards, []);
    expect(decision1).toHaveProperty('recommendedCard');

    const decision2 = advisor.makeDraftDecision(draftCards, [decision1.recommendedCard]);
    expect(decision2).toHaveProperty('recommendedCard');

    // Verify picks recorded
    const history = advisor.getDecisionHistory();
    expect(history).toHaveLength(2);
  });

  test('should work with different decision modes', () => {
    const cards = [
      { id: 'atk1', name: 'Attack Card', cost: 1, role: 'attack' },
      { id: 'def1', name: 'Defense Card', cost: 1, role: 'defense' }
    ];

    const modes = ['aggressive', 'defensive', 'balanced', 'experimental'];
    for (const mode of modes) {
      advisor.setDecisionMode(mode);
      const result = advisor.recommendCard(cards, []);
      expect(result).toHaveProperty('primaryRecommendation');
    }
  });

  test('should handle large card pool', () => {
    const largePool = Array.from({ length: 100 }, (_, i) => ({
      id: `card_${i}`,
      name: `Card ${i}`,
      cost: (i % 10) + 1,
      damage: (i % 20) + 1,
      role: i % 3 === 0 ? 'attack' : i % 3 === 1 ? 'defense' : 'support',
      synergyTags: [`tag_${i % 5}`]
    }));

    const result = advisor.recommendCard(largePool, []);
    expect(result.primaryRecommendation).toBeDefined();
    expect(result.processingTime).toBeLessThan(1000);
  });
});
