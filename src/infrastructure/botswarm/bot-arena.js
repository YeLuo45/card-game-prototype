// ============================================================================
// Bot Swarm Arena — V272 Direction B Iteration 9/9
// BotArena: 竞技场 (比赛运行/状态追踪/录像/回放/统计)
// 来源：nanobot mesh + generic-agent L0-L4 + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  var ARENA_STATUS = {
    IDLE: 'idle',
    RUNNING: 'running',
    PAUSED: 'paused',
    COMPLETED: 'completed'
  };

  var EVENT_TYPES = {
    GAME_START: 'game_start',
    MOVE: 'move',
    STATE_CHANGE: 'state_change',
    ROUND_END: 'round_end',
    GAME_END: 'game_end'
  };

  function BotArena(options) {
    options = options || {};
    this.id = options.id || ('arena_' + Date.now());
    this.maxGames = options.maxGames || 1000;
    this.maxTurnsPerGame = options.maxTurnsPerGame || 200;
    this.games = {};
    this.gameLog = [];
    this.stats = {
      gamesPlayed: 0,
      totalTurns: 0,
      totalDuration: 0,
      wins: { bot1: 0, bot2: 0, draw: 0 }
    };
    this.currentGame = null;
  }

  // ---- Game management ----
  BotArena.prototype.startGame = function (bot1, bot2, options) {
    if (typeof bot1 !== 'string' || typeof bot2 !== 'string') return { error: 'invalid_bots' };
    if (bot1 === bot2) return { error: 'same_bot' };
    if (Object.keys(this.games).length >= this.maxGames) return { error: 'arena_full' };
    var gameId = 'g_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    var game = {
      gameId: gameId,
      bot1: bot1,
      bot2: bot2,
      status: ARENA_STATUS.RUNNING,
      turn: 0,
      state: {},
      history: [],
      options: options || {},
      startedAt: Date.now(),
      endedAt: null,
      winner: null,
      duration: 0
    };
    this.games[gameId] = game;
    this.currentGame = gameId;
    this.gameLog.push({ type: 'game_start', gameId: gameId, bot1: bot1, bot2: bot2, ts: Date.now() });
    game.history.push({ type: 'game_start', turn: 0, ts: Date.now() });
    return { success: true, gameId: gameId, game: game };
  };

  BotArena.prototype.getGame = function (gameId) {
    return this.games[gameId] || null;
  };

  BotArena.prototype.getCurrentGame = function () {
    return this.currentGame ? this.games[this.currentGame] : null;
  };

  BotArena.prototype.getAllGames = function () {
    var arr = [];
    for (var k in this.games) {
      if (Object.prototype.hasOwnProperty.call(this.games, k)) {
        arr.push(this.games[k]);
      }
    }
    return arr;
  };

  BotArena.prototype.getActiveGames = function () {
    return this.getAllGames().filter(function (g) { return g.status === ARENA_STATUS.RUNNING; });
  };

  // ---- Move / state ----
  BotArena.prototype.recordMove = function (gameId, botId, action, data) {
    var game = this.games[gameId];
    if (!game) return { error: 'not_found' };
    if (game.status !== ARENA_STATUS.RUNNING) return { error: 'game_not_running' };
    if (typeof action !== 'string' || action.length === 0) return { error: 'invalid_action' };
    if (game.turn >= this.maxTurnsPerGame) return { error: 'max_turns' };
    game.turn++;
    var move = {
      type: 'move',
      turn: game.turn,
      botId: botId,
      action: action,
      data: data || {},
      ts: Date.now()
    };
    game.history.push(move);
    this.gameLog.push({ type: 'move', gameId: gameId, botId: botId, action: action, ts: Date.now() });
    this.stats.totalTurns++;
    return { success: true, turn: game.turn, move: move };
  };

  BotArena.prototype.updateState = function (gameId, stateUpdate) {
    var game = this.games[gameId];
    if (!game) return { error: 'not_found' };
    if (typeof stateUpdate !== 'object') return { error: 'invalid_state' };
    for (var k in stateUpdate) {
      if (Object.prototype.hasOwnProperty.call(stateUpdate, k)) {
        game.state[k] = stateUpdate[k];
      }
    }
    game.history.push({ type: 'state_change', turn: game.turn, state: JSON.parse(JSON.stringify(stateUpdate)), ts: Date.now() });
    return { success: true, state: game.state };
  };

  BotArena.prototype.endGame = function (gameId, result) {
    var game = this.games[gameId];
    if (!game) return { error: 'not_found' };
    if (game.status === ARENA_STATUS.COMPLETED) return { error: 'already_completed' };
    game.status = ARENA_STATUS.COMPLETED;
    game.endedAt = Date.now();
    game.duration = game.endedAt - game.startedAt;
    if (result) {
      game.winner = result.winner || null;
      game.result = result;
    }
    game.history.push({ type: 'game_end', turn: game.turn, result: result, ts: Date.now() });
    this.gameLog.push({ type: 'game_end', gameId: gameId, result: result, ts: Date.now() });
    this.stats.gamesPlayed++;
    this.stats.totalDuration += game.duration;
    if (result) {
      if (result.draw) this.stats.wins.draw++;
      else if (result.winner === game.bot1) this.stats.wins.bot1++;
      else if (result.winner === game.bot2) this.stats.wins.bot2++;
    }
    if (this.currentGame === gameId) this.currentGame = null;
    return { success: true, game: game };
  };

  BotArena.prototype.pauseGame = function (gameId) {
    var game = this.games[gameId];
    if (!game) return { error: 'not_found' };
    if (game.status !== ARENA_STATUS.RUNNING) return { error: 'not_running' };
    game.status = ARENA_STATUS.PAUSED;
    return { success: true };
  };

  BotArena.prototype.resumeGame = function (gameId) {
    var game = this.games[gameId];
    if (!game) return { error: 'not_found' };
    if (game.status !== ARENA_STATUS.PAUSED) return { error: 'not_paused' };
    game.status = ARENA_STATUS.RUNNING;
    return { success: true };
  };

  // ---- Replay ----
  BotArena.prototype.getReplay = function (gameId) {
    var game = this.games[gameId];
    if (!game) return { error: 'not_found' };
    return {
      gameId: gameId,
      bot1: game.bot1,
      bot2: game.bot2,
      startedAt: game.startedAt,
      endedAt: game.endedAt,
      totalTurns: game.turn,
      moves: game.history.filter(function (h) { return h.type === 'move'; }),
      stateChanges: game.history.filter(function (h) { return h.type === 'state_change'; })
    };
  };

  BotArena.prototype.replayAt = function (gameId, turn) {
    var game = this.games[gameId];
    if (!game) return { error: 'not_found' };
    var state = {};
    for (var i = 0; i < game.history.length; i++) {
      var h = game.history[i];
      if (h.type === 'state_change' && h.turn <= turn) {
        for (var k in h.state) {
          if (Object.prototype.hasOwnProperty.call(h.state, k)) {
            state[k] = h.state[k];
          }
        }
      }
      if (h.turn > turn && h.type === 'move') break;
    }
    return { turn: turn, state: state, totalTurns: game.turn };
  };

  // ---- Stats ----
  BotArena.prototype.getBotStats = function (botId) {
    var games = this.getAllGames();
    var wins = 0, losses = 0, draws = 0;
    for (var i = 0; i < games.length; i++) {
      var g = games[i];
      if (g.bot1 !== botId && g.bot2 !== botId) continue;
      if (!g.result) continue;
      if (g.result.draw) draws++;
      else if (g.result.winner === botId) wins++;
      else losses++;
    }
    var total = wins + losses + draws;
    return {
      botId: botId,
      wins: wins,
      losses: losses,
      draws: draws,
      totalGames: total,
      winRate: total > 0 ? wins / total : 0
    };
  };

  BotArena.prototype.getStats = function () {
    return JSON.parse(JSON.stringify(this.stats));
  };

  BotArena.prototype.getGameLog = function (limit) {
    if (typeof limit === 'number' && limit > 0) {
      return this.gameLog.slice(-limit);
    }
    return this.gameLog.slice();
  };

  // ---- Export / Import ----
  BotArena.prototype.exportGame = function (gameId) {
    var game = this.games[gameId];
    if (!game) return { error: 'not_found' };
    return JSON.stringify({ format: 'arena-game-v1', game: game, exportedAt: Date.now() });
  };

  BotArena.prototype.importGame = function (jsonString) {
    if (typeof jsonString !== 'string') return { error: 'invalid_input' };
    try {
      var parsed = JSON.parse(jsonString);
      if (parsed.format !== 'arena-game-v1') return { error: 'unknown_format' };
      this.games[parsed.game.gameId] = parsed.game;
      return { success: true, gameId: parsed.game.gameId };
    } catch (e) {
      return { error: 'parse_error' };
    }
  };

  BotArena.prototype.exportAll = function () {
    return JSON.stringify({
      format: 'arena-all-v1',
      games: this.games,
      stats: this.stats,
      exportedAt: Date.now()
    });
  };

  // ---- Cleanup ----
  BotArena.prototype.clearCompleted = function () {
    var initial = Object.keys(this.games).length;
    for (var k in this.games) {
      if (Object.prototype.hasOwnProperty.call(this.games, k) && this.games[k].status === ARENA_STATUS.COMPLETED) {
        delete this.games[k];
      }
    }
    var removed = initial - Object.keys(this.games).length;
    return { success: true, removed: removed };
  };

  BotArena.prototype.clear = function () {
    this.games = {};
    this.gameLog = [];
    this.currentGame = null;
    this.stats = { gamesPlayed: 0, totalTurns: 0, totalDuration: 0, wins: { bot1: 0, bot2: 0, draw: 0 } };
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.BotArena = BotArena;
    window.ARENA_STATUS = ARENA_STATUS;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BotArena: BotArena, ARENA_STATUS: ARENA_STATUS };
  }
})();
