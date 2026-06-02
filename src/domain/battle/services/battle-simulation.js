// ============================================================================
// Card Battle Simulation — V144 Direction A
// Turn-based card battle simulator with AI opponents and match analytics
// thunderbolt offline-first + nanobot tool registry + generic-agent L0-L4 state machine
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // BattleCard: Card with battle stats
  // -----------------------------------------------------------------------
  function BattleCard(id, name, cost, power, toughness, tags) {
    this.id = id;
    this.name = name || 'Unknown';
    this.cost = cost || 0;
    this.power = power || 0;
    this.toughness = toughness || 0;
    this.tags = tags || [];
    this.currentPower = this.power;
    this.currentToughness = this.toughness;
    this.status = 'ready'; // ready | exhausted | destroyed
  }

  BattleCard.prototype.exhaust = function () { this.status = 'exhausted'; };
  BattleCard.prototype.refresh = function () { this.status = 'ready'; };
  BattleCard.prototype.takeDamage = function (dmg) {
    this.currentToughness -= dmg;
    if (this.currentToughness <= 0) this.status = 'destroyed';
  };
  BattleCard.prototype.isAlive = function () { return this.status !== 'destroyed' && this.currentToughness > 0; };

  // -----------------------------------------------------------------------
  // PlayerState: Player's battle state
  // -----------------------------------------------------------------------
  function PlayerState(id, name) {
    this.id = id;
    this.name = name || 'Player';
    this.health = 20;
    this.mana = 0;
    this.maxMana = 0;
    this.deck = [];
    this.hand = [];
    this.field = [];
    this.graveyard = [];
    this.turn = 0;
    this.phase = 'draw'; // draw | main | combat | end
    this.canPlay = true;
  }

  PlayerState.prototype.drawCard = function () {
    if (this.deck.length > 0) {
      var card = this.deck.shift();
      this.hand.push(card);
      return card;
    }
    return null;
  };

  PlayerState.prototype.playCard = function (cardIndex) {
    if (cardIndex < 0 || cardIndex >= this.hand.length) return { error: 'invalid_index' };
    var card = this.hand[cardIndex];
    if (this.mana < card.cost) return { error: 'not_enough_mana' };
    if (this.field.length >= 5) return { error: 'field_full' };

    this.mana -= card.cost;
    this.hand.splice(cardIndex, 1);
    this.field.push(card);
    return { success: true, card: card };
  };

  PlayerState.prototype.startTurn = function () {
    this.turn++;
    this.phase = 'draw';
    if (this.maxMana < 10) this.maxMana++;
    this.mana = this.maxMana;
    for (var i = 0; i < this.field.length; i++) this.field[i].refresh();
    this.drawCard();
  };

  PlayerState.prototype.canAttack = function (card) {
    return card && card.status === 'ready' && this.turn > 0;
  };

  PlayerState.prototype.isDefeated = function () { return this.health <= 0; };

  PlayerState.prototype.takeDamage = function (dmg) {
    this.health -= dmg;
    if (this.health < 0) this.health = 0;
  };

  PlayerState.prototype.summarize = function () {
    return {
      id: this.id, health: this.health, mana: this.mana + '/' + this.maxMana,
      hand: this.hand.length, field: this.field.length, deck: this.deck.length,
      turn: this.turn, phase: this.phase
    };
  };

  // -----------------------------------------------------------------------
  // BattleSimulator: Core battle logic
  // -----------------------------------------------------------------------
  function BattleSimulator() {
    this._events = { phase: [], attack: [], damage: [], turn: [], end: [] };
  }

  BattleSimulator.prototype.on = function (event, fn) {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(fn);
  };

  BattleSimulator.prototype._emit = function (event, data) {
    var arr = this._events[event] || [];
    for (var i = 0; i < arr.length; i++) arr[i](data);
  };

  BattleSimulator.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) console.log('[BattleSim] ' + msg);
  };

  // Initialize a battle between two players
  BattleSimulator.prototype.initBattle = function (p1Deck, p2Deck, p1Name, p2Name) {
    if (!p1Deck || !p2Deck) return { error: 'missing_deck' };

    this.player1 = new PlayerState('p1', p1Name || 'Player 1');
    this.player2 = new PlayerState('p2', p2Name || 'Player 2');

    this.player1.deck = p1Deck.slice(0, 20);
    this.player2.deck = p2Deck.slice(0, 20);

    this.player1.maxMana = 1;
    this.player1.mana = 1;
    this.player2.maxMana = 1;
    this.player2.mana = 1;

    this.currentPlayer = this.player1;
    this.winner = null;
    this.turnCount = 0;
    this.phase = 'init';
    this.log = [];

    this._log('Battle initialized: ' + (p1Name||'P1') + ' vs ' + (p2Name||'P2'));
    return { success: true };
  };

  // Start the battle (first turn setup)
  BattleSimulator.prototype.start = function () {
    // Draw initial hands (3 cards each)
    for (var i = 0; i < 3; i++) {
      this.player1.drawCard();
      this.player2.drawCard();
    }
    this.phase = 'turn_start';
    this._emit('phase', { phase: 'start', turn: 0 });
    this._log('Battle started');
    return { success: true };
  };

  // Process a full turn for current player
  BattleSimulator.prototype.processTurn = function (autoPlay) {
    var cp = this.currentPlayer;
    var opponent = cp === this.player1 ? this.player2 : this.player1;

    cp.startTurn();
    this.turnCount++;
    this._emit('turn', { turn: this.turnCount, player: cp.id });

    // Main phase: play cards if autoPlay
    if (autoPlay) {
      var played = true;
      while (played && cp.field.length < 5) {
        played = false;
        for (var i = 0; i < cp.hand.length; i++) {
          var card = cp.hand[i];
          if (cp.mana >= card.cost) {
            var r = cp.playCard(i);
            if (r.success) {
              this._emit('play', { player: cp.id, card: card });
              played = true;
              break;
            }
          }
        }
        if (!played) break;
      }
    }

    // Combat phase: all ready creatures attack
    this.phase = 'combat';
    this._emit('phase', { phase: 'combat', player: cp.id });

    for (var j = 0; j < cp.field.length; j++) {
      var attacker = cp.field[j];
      if (!cp.canAttack(attacker)) continue;

      // Simple AI: attack directly if no blockers, else attack weakest
      var blockers = opponent.field.filter(function (c) { return c.status === 'ready' && c.isAlive(); });

      if (blockers.length === 0) {
        // Direct damage
        opponent.takeDamage(attacker.currentPower);
        this._emit('attack', { attacker: attacker.id, target: 'player', damage: attacker.currentPower, player: opponent.id });
        attacker.exhaust();
      } else {
        // Block with weakest creature
        var weakest = blockers.reduce(function (a, b) {
          return a.currentToughness < b.currentToughness ? a : b;
        });

        var atkDmg = attacker.currentPower;
        var defDmg = weakest.currentPower;

        weakest.takeDamage(atkDmg);
        attacker.takeDamage(defDmg);

        this._emit('attack', { attacker: attacker.id, blocker: weakest.id, attackerDamage: atkDmg, blockerDamage: defDmg });
        attacker.exhaust();
      }
    }

    // End phase
    this.phase = 'end';
    this._emit('phase', { phase: 'end', player: cp.id });

    // Check for winner
    if (opponent.isDefeated()) {
      this.winner = cp;
      this.phase = 'end';
      this._emit('end', { winner: cp.id, reason: 'defeat' });
      this._log('Winner: ' + cp.id);
      return { winner: cp.id, reason: 'defeat' };
    }

    // Switch player
    this.currentPlayer = cp === this.player1 ? this.player2 : this.player1;
    return { success: true, turn: this.turnCount };
  };

  // Run full battle to completion
  BattleSimulator.prototype.runFullBattle = function (maxTurns) {
    var maxT = maxTurns || 50;
    this.start();

    while (!this.winner && this.turnCount < maxT) {
      var r = this.processTurn(true);
      if (r.winner) break;
    }

    if (!this.winner) {
      // Timeout - determine winner by health
      if (this.player1.health > this.player2.health) this.winner = this.player1;
      else if (this.player2.health > this.player1.health) this.winner = this.player2;
      else this.winner = null; // draw
      this._emit('end', { winner: this.winner ? this.winner.id : null, reason: 'timeout' });
    }

    return {
      winner: this.winner ? this.winner.id : 'draw',
      winnerName: this.winner ? this.winner.name : 'Draw',
      turns: this.turnCount,
      p1Health: this.player1.health,
      p2Health: this.player2.health
    };
  };

  // Get battle summary
  BattleSimulator.prototype.getSummary = function () {
    return {
      phase: this.phase,
      turn: this.turnCount,
      currentPlayer: this.currentPlayer ? this.currentPlayer.id : null,
      winner: this.winner ? this.winner.id : null,
      players: {
        p1: this.player1 ? this.player1.summarize() : null,
        p2: this.player2 ? this.player2.summarize() : null
      }
    };
  };

  // Play a card from hand (manual)
  BattleSimulator.prototype.playCard = function (playerId, cardIndex) {
    var p = playerId === 'p1' ? this.player1 : this.player2;
    if (!p) return { error: 'player_not_found' };
    if (this.currentPlayer !== p) return { error: 'not_your_turn' };
    return p.playCard(cardIndex);
  };

  // Get player hand
  BattleSimulator.prototype.getHand = function (playerId) {
    var p = playerId === 'p1' ? this.player1 : this.player2;
    if (!p) return null;
    return p.hand.map(function (c) { return { id: c.id, name: c.name, cost: c.cost, power: c.power, toughness: c.currentToughness }; });
  };

  // Clear all events
  BattleSimulator.prototype.clearEvents = function () {
    this._events = { phase: [], attack: [], damage: [], turn: [], end: [] };
  };

  // -----------------------------------------------------------------------
  // AI Opponent: Simple AI for automated play
  // -----------------------------------------------------------------------
  function BattleAI(difficulty) {
    this.difficulty = difficulty || 'normal'; // easy | normal | hard
  }

  BattleAI.prototype.decidePlay = function (player, simulator) {
    var playable = [];
    for (var i = 0; i < player.hand.length; i++) {
      if (player.mana >= player.hand[i].cost) playable.push({ index: i, card: player.hand[i] });
    }

    if (playable.length === 0) return null;

    // Easy: random, Normal: high cost first, Hard: highest power first
    if (this.difficulty === 'easy') {
      return playable[Math.floor(Math.random() * playable.length)];
    } else if (this.difficulty === 'hard') {
      return playable.reduce(function (a, b) { return a.card.power > b.card.power ? a : b; });
    } else {
      return playable.reduce(function (a, b) { return a.card.cost > b.card.cost ? a : b; });
    }
  };

  // -----------------------------------------------------------------------
  // MatchAnalyzer: Post-match statistics
  // -----------------------------------------------------------------------
  function MatchAnalyzer() {}

  MatchAnalyzer.prototype.analyze = function (simulator) {
    var result = {
      turns: simulator.turnCount,
      winner: simulator.winner ? simulator.winner.id : 'draw',
      damageDealt: { p1: 0, p2: 0 },
      cardsPlayed: { p1: 0, p2: 0 },
      peakField: { p1: 0, p2: 0 }
    };

    if (simulator.player1) {
      result.damageDealt.p1 = 20 - simulator.player2.health;
      result.cardsPlayed.p1 = simulator.player1.graveyard.length;
      result.peakField.p1 = Math.max(result.peakField.p1, simulator.player1.field.length);
    }
    if (simulator.player2) {
      result.damageDealt.p2 = 20 - simulator.player1.health;
      result.cardsPlayed.p2 = simulator.player2.graveyard.length;
      result.peakField.p2 = Math.max(result.peakField.p2, simulator.player2.field.length);
    }

    result.duration = simulator.turnCount;
    return result;
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.BattleCard = BattleCard;
  window.PlayerState = PlayerState;
  window.BattleSimulator = BattleSimulator;
  window.BattleAI = BattleAI;
  window.MatchAnalyzer = MatchAnalyzer;
})();