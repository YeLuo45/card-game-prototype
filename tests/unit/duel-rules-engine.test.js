/**
 * Duel Rules Engine Tests
 * Tests DuelRulesEngine: turn-based rules / win-loss logic / special rules
 */

const { DuelRulesEngine } = require('../../src/duel-rules-engine.js');

describe('DuelRulesEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new DuelRulesEngine();
  });

  describe('constructor', () => {
    test('initializes with default settings', () => {
      expect(engine.settings).toBeDefined();
      expect(engine.settings.timeLimit).toBe(60);
      expect(engine.settings.maxHandSize).toBe(10);
      expect(engine.settings.winCondition).toBe('life_zero');
    });

    test('initializes with custom settings', () => {
      const customEngine = new DuelRulesEngine({
        timeLimit: 120,
        maxHandSize: 8,
        winCondition: 'cards_depleted'
      });
      
      expect(customEngine.settings.timeLimit).toBe(120);
      expect(customEngine.settings.maxHandSize).toBe(8);
      expect(customEngine.settings.winCondition).toBe('cards_depleted');
    });
  });

  describe('startDuel', () => {
    test('initializes duel state for two players', () => {
      const state = engine.startDuel('player1', 'player2');

      expect(state).toBeDefined();
      expect(state.player1Id).toBe('player1');
      expect(state.player2Id).toBe('player2');
      expect(state.currentTurn).toBe('player1');
      expect(state.turnNumber).toBe(1);
      expect(state.player1Life).toBe(100);
      expect(state.player2Life).toBe(100);
    });

    test('sets initial hand sizes', () => {
      const state = engine.startDuel('player1', 'player2');

      expect(state.player1Hand).toEqual([]);
      expect(state.player2Hand).toEqual([]);
    });
  });

  describe('executeTurn', () => {
    test('executes card play action', () => {
      const state = engine.startDuel('player1', 'player2');
      const action = {
        type: 'play_card',
        playerId: 'player1',
        cardId: 'strike',
        target: 'player2',
        damage: 6
      };

      const result = engine.executeTurn(state, action);

      expect(result.success).toBe(true);
      engine.applyDamage(state, 'player2', 6);
      expect(state.player2Life).toBe(94);
    });

    test('rejects action from non-current player', () => {
      const state = engine.startDuel('player1', 'player2');
      const action = {
        type: 'play_card',
        playerId: 'player2',
        cardId: 'strike'
      };

      const result = engine.executeTurn(state, action);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not your turn');
    });

    test('handles draw action', () => {
      const state = engine.startDuel('player1', 'player2');
      state.player1Deck = ['card1', 'card2', 'card3'];
      const action = {
        type: 'draw',
        playerId: 'player1'
      };

      const result = engine.executeTurn(state, action);

      expect(result.success).toBe(true);
      expect(state.player1Hand).toContain('card1');
    });
  });

  describe('switchTurn', () => {
    test('switches to other player', () => {
      const state = engine.startDuel('player1', 'player2');
      
      engine.switchTurn(state);

      expect(state.currentTurn).toBe('player2');
    });

    test('increments turn number', () => {
      const state = engine.startDuel('player1', 'player2');
      const initialTurn = state.turnNumber;
      
      engine.switchTurn(state);

      expect(state.turnNumber).toBe(initialTurn + 1);
    });
  });

  describe('checkWinCondition', () => {
    test('detects win when opponent life reaches zero', () => {
      const state = engine.startDuel('player1', 'player2');
      state.player2Life = 0;

      const result = engine.checkWinCondition(state);

      expect(result.winner).toBe('player1');
      expect(result.gameOver).toBe(true);
    });

    test('returns no winner when both alive', () => {
      const state = engine.startDuel('player1', 'player2');

      const result = engine.checkWinCondition(state);

      expect(result.winner).toBeNull();
      expect(result.gameOver).toBe(false);
    });

    test('detects draw when both reach zero simultaneously', () => {
      const state = engine.startDuel('player1', 'player2');
      state.player1Life = 0;
      state.player2Life = 0;

      const result = engine.checkWinCondition(state);

      expect(result.winner).toBe('draw');
      expect(result.gameOver).toBe(true);
    });
  });

  describe('checkTimeLimit', () => {
    test('detects timeout', () => {
      const state = engine.startDuel('player1', 'player2');
      state.startTime = Date.now() - (engine.settings.timeLimit * 1000 + 1000);

      const result = engine.checkTimeLimit(state);

      expect(result.timeout).toBe(true);
    });

    test('no timeout when time remaining', () => {
      const state = engine.startDuel('player1', 'player2');

      const result = engine.checkTimeLimit(state);

      expect(result.timeout).toBe(false);
    });
  });

  describe('applyDamage', () => {
    test('reduces player life', () => {
      const state = engine.startDuel('player1', 'player2');

      engine.applyDamage(state, 'player2', 10);

      expect(state.player2Life).toBe(90);
    });

    test('respects minimum life of zero', () => {
      const state = engine.startDuel('player1', 'player2');

      engine.applyDamage(state, 'player1', 150);

      expect(state.player1Life).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateHandSize', () => {
    test('validates hand within limit', () => {
      const state = engine.startDuel('player1', 'player2');
      state.player1Hand = ['c1', 'c2', 'c3'];

      const result = engine.validateHandSize(state, 'player1');

      expect(result.valid).toBe(true);
    });

    test('detects hand over limit', () => {
      const state = engine.startDuel('player1', 'player2');
      state.player1Hand = Array(11).fill('card');

      const result = engine.validateHandSize(state, 'player1');

      expect(result.valid).toBe(false);
    });
  });

  describe('getValidActions', () => {
    test('returns valid actions for current player', () => {
      const state = engine.startDuel('player1', 'player2');
      state.player1Hand = ['strike', 'defend'];
      state.player1Deck = ['card1'];

      const actions = engine.getValidActions(state, 'player1');

      expect(actions).toContain('play_card');
      expect(actions).toContain('draw');
      expect(actions).toContain('end_turn');
    });

    test('returns empty when not player turn', () => {
      const state = engine.startDuel('player1', 'player2');
      state.player1Hand = ['strike'];

      const actions = engine.getValidActions(state, 'player2');

      expect(actions).toEqual([]);
    });
  });
});