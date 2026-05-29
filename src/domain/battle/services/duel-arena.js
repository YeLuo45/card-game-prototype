// ============================================================================
// Card Duel Arena — V155 Direction B
// Turn-based duel system with AI opponents and strategic depth
// nanobot distributed mesh + chatdev multi-agent + thunderbolt
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // Card: Battle card with stats
  // -----------------------------------------------------------------------
  function Card(id, name, cost, attack, health, abilities) {
    this.id = id || '';
    this.name = name || '';
    this.cost = cost || 0;
    this.attack = attack || 0;
    this.health = health || 1;
    this.maxHealth = health || 1;
    this.abilities = abilities || [];
    this.buffs = [];
    this.canAttack = false;
    this.summoningSickness = true;
  }

  Card.prototype.takeDamage = function (amount) {
    this.health = Math.max(0, this.health - amount);
    return this.health;
  };

  Card.prototype.heal = function (amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  };

  Card.prototype.addBuff = function (buff) {
    this.buffs.push(buff);
  };

  Card.prototype.isAlive = function () { return this.health > 0; };

  // --------------------------------------------------------------------===
  // DuelPlayer: Player state in a duel
  // ========================================================================
  function DuelPlayer(id, name, health, mana, maxMana) {
    this.id = id || '';
    this.name = name || '';
    this.health = health || 30;
    this.maxHealth = health || 30;
    this.mana = mana || 1;
    this.maxMana = maxMana || 1;
    this.deck = [];
    this.hand = [];
    this.field = [];
    this.graveyard = [];
  }

  DuelPlayer.prototype.drawCard = function () {
    if (this.deck.length === 0) return null;
    var card = this.deck.shift();
    if (this.hand.length < 10) this.hand.push(card);
    return card;
  };

  DuelPlayer.prototype.summon = function (card) {
    if (this.field.length >= 5) return { error: 'field_full' };
    if (this.mana < card.cost) return { error: 'insufficient_mana' };
    this.mana -= card.cost;
    this.hand.splice(this.hand.indexOf(card), 1);
    card.summoningSickness = true;
    card.canAttack = false;
    this.field.push(card);
    return { success: true };
  };

  DuelPlayer.prototype.getTotalFieldPower = function () {
    var total = 0;
    for (var i = 0; i < this.field.length; i++) total += this.field[i].attack;
    return total;
  };

  DuelPlayer.prototype.isAlive = function () { return this.health > 0; };

  // --------------------------------------------------------------------===
  // DuelState: State machine states
  // ========================================================================
  var DuelState = {
    WAITING: 'waiting',
    PLAYER_TURN: 'player_turn',
    OPPONENT_TURN: 'opponent_turn',
    ENDED: 'ended'
  };

  // --------------------------------------------------------------------===
  // DuelResult: Duel outcomes
  // ========================================================================
  var DuelResult = {
    PLAYER_WIN: 'player_win',
    OPPONENT_WIN: 'opponent_win',
    DRAW: 'draw',
    IN_PROGRESS: 'in_progress'
  };

  // --------------------------------------------------------------------===
  // DuelArena: Main duel engine
  // ========================================================================
  function DuelArena(storageKey) {
    this.storageKey = storageKey || 'duel_arena';
    this._currentDuel = null;
    this._stats = { totalDuels: 0, playerWins: 0, opponentWins: 0, draws: 0 };
    this._history = [];
    this._init();
  }

  DuelArena.prototype._init = function () {
    this._load();
  };

  DuelArena.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._stats = data.stats || this._stats;
          this._history = data.history || this._history;
        }
      }
    } catch (e) {}
  };

  DuelArena.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          stats: this._stats,
          history: this._history
        }));
      }
    } catch (e) {}
  };

  DuelArena.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) console.log('[DuelArena] ' + msg);
  };

  // Start a new duel
  DuelArena.prototype.startDuel = function (playerId, opponentId, playerDeck, opponentDeck) {
    if (this._currentDuel && this._currentDuel.state !== DuelState.ENDED) {
      return { error: 'duel_in_progress' };
    }

    var player = new DuelPlayer(playerId, 'Player', 30, 1, 1);
    var opponent = new DuelPlayer(opponentId, 'AI Opponent', 30, 1, 1);

    player.deck = playerDeck || [];
    opponent.deck = opponentDeck || [];

    // Shuffle decks
    this._shuffle(player.deck);
    this._shuffle(opponent.deck);

    // Draw initial hands (3 cards each)
    for (var i = 0; i < 3; i++) {
      player.drawCard();
      opponent.drawCard();
    }

    this._currentDuel = {
      player: player,
      opponent: opponent,
      state: DuelState.PLAYER_TURN,
      turn: 1,
      winner: null
    };

    this._stats.totalDuels++;
    this._save();
    this._log('Duel started: ' + playerId + ' vs ' + opponentId);
    return { success: true, duel: this._currentDuel };
  };

  DuelArena.prototype._shuffle = function (arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
  };

  // Get current duel
  DuelArena.prototype.getDuel = function () {
    return this._currentDuel;
  };

  // Get current state
  DuelArena.prototype.getState = function () {
    return this._currentDuel ? this._currentDuel.state : null;
  };

  // Player plays a card from hand
  DuelArena.prototype.playCard = function (cardIndex) {
    if (!this._currentDuel) return { error: 'no_active_duel' };
    if (this._currentDuel.state !== DuelState.PLAYER_TURN) return { error: 'not_player_turn' };

    var card = this._currentDuel.player.hand[cardIndex];
    if (!card) return { error: 'card_not_found' };

    var result = this._currentDuel.player.summon(card);
    if (result.error) return result;

    this._save();
    return result;
  };

  // Player attacks with a field card
  DuelArena.prototype.attackWith = function (playerCardIndex, opponentCardIndex) {
    if (!this._currentDuel) return { error: 'no_active_duel' };
    if (this._currentDuel.state !== DuelState.PLAYER_TURN) return { error: 'not_player_turn' };

    var attacker = this._currentDuel.player.field[playerCardIndex];
    var defender = this._currentDuel.opponent.field[opponentCardIndex];
    if (!attacker || !defender) return { error: 'card_not_found' };

    if (!attacker.canAttack) return { error: 'cannot_attack' };
    if (attacker.summoningSickness) return { error: 'summoning_sickness' };

    // Combat
    defender.takeDamage(attacker.attack);
    attacker.takeDamage(defender.attack);
    attacker.canAttack = false;

    // Check if defender died
    if (!defender.isAlive()) {
      this._currentDuel.opponent.field.splice(opponentCardIndex, 1);
      this._currentDuel.opponent.graveyard.push(defender);
    }

    this._checkWinCondition();
    this._save();
    return { success: true, attackerHealth: attacker.health, defenderHealth: defender.health };
  };

  // Player attacks opponent directly
  DuelArena.prototype.attackOpponentDirectly = function (playerCardIndex) {
    if (!this._currentDuel) return { error: 'no_active_duel' };
    if (this._currentDuel.state !== DuelState.PLAYER_TURN) return { error: 'not_player_turn' };

    var attacker = this._currentDuel.player.field[playerCardIndex];
    if (!attacker) return { error: 'card_not_found' };
    if (!attacker.canAttack || attacker.summoningSickness) return { error: 'cannot_attack' };

    this._currentDuel.opponent.health -= attacker.attack;
    attacker.canAttack = false;

    this._checkWinCondition();
    this._save();
    return { success: true, opponentHealth: this._currentDuel.opponent.health };
  };

  // End player turn
  DuelArena.prototype.endTurn = function () {
    if (!this._currentDuel) return { error: 'no_active_duel' };
    if (this._currentDuel.state !== DuelState.PLAYER_TURN) return { error: 'not_player_turn' };

    this._currentDuel.state = DuelState.OPPONENT_TURN;
    this._processOpponentTurn();
    this._save();
    return { success: true };
  };

  DuelArena.prototype._processOpponentTurn = function () {
    var opp = this._currentDuel.opponent;
    var player = this._currentDuel.player;

    // AI logic: simple - summon biggest card possible, then attack
    while (opp.field.length < 5 && opp.mana >= 1) {
      var playable = null;
      var bestCost = 0;
      for (var i = 0; i < opp.hand.length; i++) {
        var c = opp.hand[i];
        if (c.cost <= opp.mana && c.cost > bestCost) {
          playable = c;
          bestCost = c.cost;
        }
      }
      if (!playable) break;
      opp.summon(playable);
    }

    // Attack with all ready cards
    for (var i = 0; i < opp.field.length; i++) {
      var card = opp.field[i];
      if (!card.canAttack || card.summoningSickness) continue;

      if (player.field.length > 0) {
        // Attack first enemy
        var target = player.field[0];
        target.takeDamage(card.attack);
        card.takeDamage(target.attack);
        if (!target.isAlive()) player.field.shift();
      } else {
        // Attack player directly
        player.health -= card.attack;
      }
      card.canAttack = false;
    }

    this._checkWinCondition();

    if (this._currentDuel.state !== DuelState.ENDED) {
      this._startPlayerTurn();
    }
  };

  DuelArena.prototype._startPlayerTurn = function () {
    var player = this._currentDuel.player;
    this._currentDuel.turn++;
    this._currentDuel.state = DuelState.PLAYER_TURN;

    // Grow mana
    if (player.maxMana < 10) player.maxMana++;
    player.mana = player.maxMana;

    // Draw a card
    player.drawCard();

    // Enable attacks for ready creatures
    for (var i = 0; i < player.field.length; i++) {
      player.field[i].summoningSickness = false;
      player.field[i].canAttack = true;
    }
  };

  DuelArena.prototype._checkWinCondition = function () {
    if (!this._currentDuel) return;
    var p = this._currentDuel.player;
    var o = this._currentDuel.opponent;

    if (!p.isAlive() && !o.isAlive()) {
      this._currentDuel.winner = DuelResult.DRAW;
      this._currentDuel.state = DuelState.ENDED;
      this._stats.draws++;
    } else if (!p.isAlive()) {
      this._currentDuel.winner = DuelResult.OPPONENT_WIN;
      this._currentDuel.state = DuelState.ENDED;
      this._stats.opponentWins++;
    } else if (!o.isAlive()) {
      this._currentDuel.winner = DuelResult.PLAYER_WIN;
      this._currentDuel.state = DuelState.ENDED;
      this._stats.playerWins++;
    }
  };

  // Get stats
  DuelArena.prototype.getStats = function () {
    return {
      totalDuels: this._stats.totalDuels,
      playerWins: this._stats.playerWins,
      opponentWins: this._stats.opponentWins,
      draws: this._stats.draws
    };
  };

  // Get history
  DuelArena.prototype.getHistory = function () {
    return this._history.slice();
  };

  // --------------------------------------------------------------------===
  // Exports
  // --------------------------------------------------------------------===
  window.Card = Card;
  window.DuelPlayer = DuelPlayer;
  window.DuelState = DuelState;
  window.DuelResult = DuelResult;
  window.DuelArena = DuelArena;
})();