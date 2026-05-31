/**
 * Duel Rules Engine (Iteration 7/9)
 * Core: DuelRulesEngine
 * 
 * Features:
 * - Turn-based duel rules
 * - Win/loss determination
 * - Special rules (time limit, life points, hand size limits)
 */

class DuelRulesEngine {
  constructor(options = {}) {
    this.settings = {
      timeLimit: options.timeLimit || 60,
      maxHandSize: options.maxHandSize || 10,
      winCondition: options.winCondition || 'life_zero',
      startingLife: options.startingLife || 100,
      maxTurns: options.maxTurns || 50
    };
    this.version = 'V255-Iter7';
  }

  /**
   * Start a new duel
   * @param {string} player1Id - First player ID
   * @param {string} player2Id - Second player ID
   * @returns {object} Duel state
   */
  startDuel(player1Id, player2Id) {
    const state = {
      player1Id,
      player2Id,
      currentTurn: player1Id,
      turnNumber: 1,
      player1Life: this.settings.startingLife,
      player2Life: this.settings.startingLife,
      player1Hand: [],
      player2Hand: [],
      player1Deck: [],
      player2Deck: [],
      startTime: Date.now(),
      actions: [],
      history: []
    };

    return state;
  }

  /**
   * Execute a turn action
   * @param {object} state - Current duel state
   * @param {object} action - Action to execute
   * @returns {object} Result
   */
  executeTurn(state, action) {
    if (action.playerId !== state.currentTurn) {
      return { success: false, error: 'Not your turn' };
    }

    const result = { success: true, action };

    switch (action.type) {
      case 'play_card':
        state.history.push(action);
        break;
      case 'draw':
        if (state.currentTurn === state.player1Id && state.player1Deck.length > 0) {
          state.player1Hand.push(state.player1Deck.shift());
        } else if (state.currentTurn === state.player2Id && state.player2Deck.length > 0) {
          state.player2Hand.push(state.player2Deck.shift());
        }
        state.history.push(action);
        break;
      case 'end_turn':
        this.switchTurn(state);
        break;
    }

    return result;
  }

  /**
   * Switch to the other player's turn
   * @param {object} state - Current duel state
   */
  switchTurn(state) {
    state.currentTurn = state.currentTurn === state.player1Id 
      ? state.player2Id 
      : state.player1Id;
    state.turnNumber++;
  }

  /**
   * Check win conditions
   * @param {object} state - Current duel state
   * @returns {object} Win condition result
   */
  checkWinCondition(state) {
    let winner = null;
    let gameOver = false;

    if (state.player1Life <= 0 && state.player2Life <= 0) {
      winner = 'draw';
      gameOver = true;
    } else if (state.player2Life <= 0) {
      winner = state.player1Id;
      gameOver = true;
    } else if (state.player1Life <= 0) {
      winner = state.player2Id;
      gameOver = true;
    }

    return { winner, gameOver };
  }

  /**
   * Check if time limit has been exceeded
   * @param {object} state - Current duel state
   * @returns {object} Timeout result
   */
  checkTimeLimit(state) {
    const elapsed = (Date.now() - state.startTime) / 1000;
    const timeout = elapsed >= this.settings.timeLimit;
    return { timeout, elapsed };
  }

  /**
   * Apply damage to a player
   * @param {object} state - Current duel state
   * @param {string} targetId - Target player ID
   * @param {number} damage - Damage amount
   */
  applyDamage(state, targetId, damage) {
    if (targetId === state.player1Id) {
      state.player1Life = Math.max(0, state.player1Life - damage);
    } else if (targetId === state.player2Id) {
      state.player2Life = Math.max(0, state.player2Life - damage);
    }
  }

  /**
   * Validate hand size
   * @param {object} state - Current duel state
   * @param {string} playerId - Player ID
   * @returns {object} Validation result
   */
  validateHandSize(state, playerId) {
    const hand = playerId === state.player1Id ? state.player1Hand : state.player2Hand;
    return {
      valid: hand.length <= this.settings.maxHandSize,
      size: hand.length,
      max: this.settings.maxHandSize
    };
  }

  /**
   * Get valid actions for a player
   * @param {object} state - Current duel state
   * @param {string} playerId - Player ID
   * @returns {Array} Valid actions
   */
  getValidActions(state, playerId) {
    if (state.currentTurn !== playerId) {
      return [];
    }

    const actions = ['end_turn'];

    if (playerId === state.player1Id) {
      if (state.player1Hand.length > 0) actions.unshift('play_card');
      if (state.player1Deck.length > 0) actions.push('draw');
    } else {
      if (state.player2Hand.length > 0) actions.unshift('play_card');
      if (state.player2Deck.length > 0) actions.push('draw');
    }

    return actions;
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DuelRulesEngine };
} else if (typeof window !== 'undefined') {
  window.DuelRulesEngine = DuelRulesEngine;
}