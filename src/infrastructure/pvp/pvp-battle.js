// ============================================================================
// PvP Co-op — V285 Direction D Iteration 4/9
// PvPBattle: PvP 战斗 (attack/defense/damage/HP/MP/round)
// 来源：thunderbolt PowerSync + chatdev Multi-Agent + ruflo hierarchical
// ============================================================================
'use strict';

(function () {

  var BATTLE_STATE = {
    PENDING: 'pending',
    ACTIVE: 'active',
    ROUND_END: 'round_end',
    FINISHED: 'finished',
    CANCELLED: 'cancelled'
  };

  function PvPBattle(options) {
    options = options || {};
    this.battles = {};
    this.battleCounter = 0;
    this.maxRounds = options.maxRounds || 30;
    this.initialHp = options.initialHp || 100;
    this.initialMp = options.initialMp || 50;
    this.metrics = {
      battlesStarted: 0,
      attacks: 0,
      heals: 0,
      rounds: 0,
      finished: 0
    };
  }

  PvPBattle.prototype.create = function (config) {
    config = config || {};
    if (!config.player1 || !config.player2) return { error: 'missing_players' };
    var battleId = 'b_' + (++this.battleCounter) + '_' + Date.now();
    var battle = {
      battleId: battleId,
      player1: this._initCombatant(config.player1),
      player2: this._initCombatant(config.player2),
      state: BATTLE_STATE.PENDING,
      round: 0,
      maxRounds: config.maxRounds || this.maxRounds,
      log: [],
      turn: 1,  // 1 or 2
      startedAt: null,
      finishedAt: null,
      winner: null
    };
    this.battles[battleId] = battle;
    return { success: true, battleId: battleId, battle: battle };
  };

  PvPBattle.prototype._initCombatant = function (player) {
    return {
      id: player.id,
      name: player.name || player.id,
      hp: player.hp || this.initialHp,
      maxHp: player.hp || this.initialHp,
      mp: player.mp || this.initialMp,
      maxMp: player.mp || this.initialMp,
      attack: player.attack || 10,
      defense: player.defense || 5,
      effects: [],
      cooldowns: {}
    };
  };

  PvPBattle.prototype.start = function (battleId) {
    var b = this.battles[battleId];
    if (!b) return { error: 'not_found' };
    if (b.state !== BATTLE_STATE.PENDING) return { error: 'invalid_state' };
    b.state = BATTLE_STATE.ACTIVE;
    b.startedAt = Date.now();
    this.metrics.battlesStarted++;
    this._log(b, 'start', null, 'battle started');
    return { success: true };
  };

  PvPBattle.prototype.attack = function (battleId, attackerId, targetId, options) {
    var b = this.battles[battleId];
    if (!b) return { error: 'not_found' };
    if (b.state !== BATTLE_STATE.ACTIVE) return { error: 'invalid_state' };
    options = options || {};
    var attacker = b[attackerId];
    var target = b[targetId];
    if (!attacker || !target) return { error: 'invalid_combatant' };
    if (b.turn === 1 && attackerId !== 'player1') return { error: 'wrong_turn' };
    if (b.turn === 2 && attackerId !== 'player2') return { error: 'wrong_turn' };
    if (attacker.hp <= 0) return { error: 'attacker_dead' };
    // calc damage
    var baseDmg = attacker.attack;
    var reduction = target.defense;
    var crit = options.critical || false;
    var variance = 0.8 + Math.random() * 0.4;  // 80% - 120%
    var dmg = Math.max(1, Math.floor((baseDmg - reduction * 0.5) * variance));
    if (crit) dmg = Math.floor(dmg * 1.5);
    target.hp = Math.max(0, target.hp - dmg);
    this.metrics.attacks++;
    this._log(b, 'attack', { from: attackerId, to: targetId, dmg: dmg, crit: crit });
    if (target.hp <= 0) {
      b.state = BATTLE_STATE.FINISHED;
      b.winner = attackerId;
      b.finishedAt = Date.now();
      this.metrics.finished++;
      this._log(b, 'end', { winner: attackerId }, 'battle finished');
    } else {
      this._advanceTurn(b);
    }
    return { success: true, dmg: dmg, targetHp: target.hp, finished: b.state === BATTLE_STATE.FINISHED };
  };

  PvPBattle.prototype.heal = function (battleId, playerId, amount) {
    var b = this.battles[battleId];
    if (!b) return { error: 'not_found' };
    if (b.state !== BATTLE_STATE.ACTIVE) return { error: 'invalid_state' };
    var c = b[playerId];
    if (!c) return { error: 'invalid_combatant' };
    if (typeof amount !== 'number' || amount <= 0) return { error: 'invalid_amount' };
    var cost = Math.ceil(amount * 0.5);
    if (c.mp < cost) return { error: 'insufficient_mp' };
    c.mp -= cost;
    var oldHp = c.hp;
    c.hp = Math.min(c.maxHp, c.hp + amount);
    var actual = c.hp - oldHp;
    this.metrics.heals++;
    this._log(b, 'heal', { player: playerId, amount: actual, mpCost: cost });
    this._advanceTurn(b);
    return { success: true, healed: actual, mp: c.mp };
  };

  PvPBattle.prototype.defend = function (battleId, playerId) {
    var b = this.battles[battleId];
    if (!b) return { error: 'not_found' };
    if (b.state !== BATTLE_STATE.ACTIVE) return { error: 'invalid_state' };
    var c = b[playerId];
    if (!c) return { error: 'invalid_combatant' };
    c.effects.push({ type: 'defending', expiresAt: Date.now() + 1 });  // 1 round
    this._log(b, 'defend', { player: playerId });
    this._advanceTurn(b);
    return { success: true };
  };

  PvPBattle.prototype._advanceTurn = function (b) {
    b.turn = b.turn === 1 ? 2 : 1;
    if (b.turn === 1) {
      b.round++;
      this.metrics.rounds++;
      if (b.round > b.maxRounds) {
        // tie by HP
        b.state = BATTLE_STATE.FINISHED;
        b.winner = b.player1.hp > b.player2.hp ? 'player1' : (b.player2.hp > b.player1.hp ? 'player2' : null);
        b.finishedAt = Date.now();
        this.metrics.finished++;
        this._log(b, 'end', { winner: b.winner, reason: 'max_rounds' });
      }
    }
  };

  PvPBattle.prototype._log = function (b, type, data, message) {
    b.log.push({ round: b.round, type: type, data: data || null, message: message || null, ts: Date.now() });
    if (b.log.length > 200) b.log = b.log.slice(-200);
  };

  PvPBattle.prototype.get = function (battleId) {
    return this.battles[battleId] || null;
  };

  PvPBattle.prototype.getState = function (battleId) {
    var b = this.battles[battleId];
    return b ? b.state : null;
  };

  PvPBattle.prototype.cancel = function (battleId, reason) {
    var b = this.battles[battleId];
    if (!b) return { error: 'not_found' };
    b.state = BATTLE_STATE.CANCELLED;
    b.cancelReason = reason || null;
    b.finishedAt = Date.now();
    this._log(b, 'cancel', { reason: reason });
    return { success: true };
  };

  PvPBattle.prototype.getLog = function (battleId, limit) {
    var b = this.battles[battleId];
    if (!b) return null;
    if (typeof limit === 'number' && limit > 0) return b.log.slice(-limit);
    return b.log.slice();
  };

  PvPBattle.prototype.getSummary = function (battleId) {
    var b = this.battles[battleId];
    if (!b) return null;
    return {
      battleId: battleId,
      state: b.state,
      round: b.round,
      turn: b.turn,
      player1Hp: b.player1.hp,
      player2Hp: b.player2.hp,
      winner: b.winner,
      actions: b.log.length
    };
  };

  PvPBattle.prototype.getMetrics = function () {
    return JSON.parse(JSON.stringify(this.metrics));
  };

  PvPBattle.prototype.clear = function () {
    this.battles = {};
    return { success: true };
  };

  if (typeof window !== 'undefined') {
    window.PvPBattle = PvPBattle;
    window.BATTLE_STATE = BATTLE_STATE;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PvPBattle: PvPBattle, BATTLE_STATE: BATTLE_STATE };
  }
})();
