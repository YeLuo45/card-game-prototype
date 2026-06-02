// ============================================================================
// Card Elemental Arena — V173 Direction C
// Elemental battle arena with advantage/disadvantage system
// thunderbolt feedback loops: element advantage cycles
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // ElementType: Element enum
  // ========================================================================
  var ElementType = {
    FIRE: 'fire',
    WATER: 'water',
    EARTH: 'earth',
    WIND: 'wind',
    LIGHT: 'light',
    SHADOW: 'shadow',
    NEUTRAL: 'neutral'
  };

  // --------------------------------------------------------------------===
  // ElementAdvantage: Resolves elemental advantage
  // ========================================================================
  var ElementAdvantage = {
    ADVANTAGE_MAP: {
      fire: { beats: 'earth', resists: 'water' },
      water: { beats: 'fire', resists: 'earth' },
      earth: { beats: 'wind', resists: 'water' },
      wind: { beats: 'earth', resists: 'shadow' },
      light: { beats: 'shadow', resists: 'shadow' },
      shadow: { beats: 'light', resists: 'wind' },
      neutral: { beats: 'neutral', resists: 'neutral' }
    },
    getAdvantage: function (attackerElement, defenderElement) {
      if (attackerElement === defenderElement) return 'neutral';
      var adv = this.ADVANTAGE_MAP[attackerElement];
      if (!adv) return 'neutral';
      if (adv.beats === defenderElement) return 'advantage';
      if (adv.resists === defenderElement) return 'disadvantage';
      return 'neutral';
    },
    getMultiplier: function (advantage) {
      if (advantage === 'advantage') return 1.5;
      if (advantage === 'disadvantage') return 0.5;
      return 1.0;
    }
  };

  // --------------------------------------------------------------------===
  // ElementalCard: Card with elemental properties
  // ========================================================================
  function ElementalCard(cardId, name, element, basePower, baseDefense) {
    this.cardId = cardId;
    this.name = name || cardId;
    this.element = element || 'neutral';
    this.basePower = basePower || 10;
    this.baseDefense = baseDefense || 5;
    this.enchantments = []; // array of { element, value }
  }

  ElementalCard.prototype.addEnchantment = function (element, value) {
    this.enchantments.push({ element: element, value: value });
    return { success: true };
  };

  ElementalCard.prototype.getEffectivePower = function () {
    var total = this.basePower;
    for (var i = 0; i < this.enchantments.length; i++) {
      total += this.enchantments[i].value;
    }
    return total;
  };

  ElementalCard.prototype.getElement = function () {
    return this.element;
  };

  // --------------------------------------------------------------------===
  // ElementalMatch: A single elemental battle match
  // ========================================================================
  function ElementalMatch(matchId) {
    this.matchId = matchId;
    this.player1Deck = [];
    this.player2Deck = [];
    this.player1Wins = 0;
    this.player2Wins = 0;
    this.rounds = []; // array of { winner, element, advantage }
    this.currentRound = 0;
    this.status = 'preparing'; // preparing, active, resolved
    this.winnerId = null;
  }

  ElementalMatch.prototype.addPlayer = function (playerId, deck) {
    if (this.player1Deck.length === 0) {
      this.player1Deck = deck.slice();
      this._player1 = playerId;
    } else if (this.player2Deck.length === 0) {
      this.player2Deck = deck.slice();
      this._player2 = playerId;
    }
    if (this.player1Deck.length > 0 && this.player2Deck.length > 0) {
      this.status = 'active';
    }
    return { success: true, playerCount: this.getPlayerCount() };
  };

  ElementalMatch.prototype.getPlayerCount = function () {
    return (this.player1Deck.length > 0 ? 1 : 0) + (this.player2Deck.length > 0 ? 1 : 0);
  };

  ElementalMatch.prototype.resolveRound = function (card1Index, card2Index) {
    if (this.status !== 'active') return { error: 'match_not_active' };
    var card1 = this.player1Deck[card1Index];
    var card2 = this.player2Deck[card2Index];
    if (!card1 || !card2) return { error: 'card_not_found' };
    var advantage = ElementAdvantage.getAdvantage(card1.element, card2.element);
    var multiplier = ElementAdvantage.getMultiplier(advantage);
    var effective1 = Math.round(card1.getEffectivePower() * multiplier);
    var effective2 = Math.round(card2.getEffectivePower() * multiplier);
    var winner = null;
    if (effective1 > effective2) winner = this._player1;
    else if (effective2 > effective1) winner = this._player2;
    if (winner === this._player1) this.player1Wins++;
    else if (winner === this._player2) this.player2Wins++;
    this.rounds.push({
      roundNumber: this.currentRound,
      card1: card1,
      card2: card2,
      effective1: effective1,
      effective2: effective2,
      winner: winner,
      advantage: advantage
    });
    this.currentRound++;
    if (this.currentRound >= Math.max(this.player1Deck.length, this.player2Deck.length)) {
      this.status = 'resolved';
      this._resolveMatch();
    }
    return {
      success: true,
      winner: winner,
      advantage: advantage,
      player1Wins: this.player1Wins,
      player2Wins: this.player2Wins
    };
  };

  ElementalMatch.prototype._resolveMatch = function () {
    if (this.player1Wins > this.player2Wins) this.winnerId = this._player1;
    else if (this.player2Wins > this.player1Wins) this.winnerId = this._player2;
    else this.winnerId = 'draw';
  };

  ElementalMatch.prototype.getMatchSummary = function () {
    return {
      matchId: this.matchId,
      winnerId: this.winnerId,
      player1Wins: this.player1Wins,
      player2Wins: this.player2Wins,
      totalRounds: this.rounds.length,
      status: this.status
    };
  };

  ElementalMatch.prototype.getRoundHistory = function () {
    return this.rounds.slice();
  };

  // --------------------------------------------------------------------===
  // ElementalArena: Manages elemental battles
  // ========================================================================
  function ElementalArena(storageKey) {
    this.storageKey = storageKey || 'elemental_arena';
    this._matches = {};
    this._matchIdCounter = 0;
    this._init();
  }

  ElementalArena.prototype._init = function () {
    this._load();
  };

  ElementalArena.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._matchIdCounter = data.matchIdCounter || 0;
        }
      }
    } catch (e) {}
  };

  ElementalArena.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          matchIdCounter: this._matchIdCounter
        }));
      }
    } catch (e) {}
  };

  ElementalArena.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[ElementalArena] ' + msg);
    }
  };

  ElementalArena.prototype.createMatch = function () {
    var matchId = 'em_' + (++this._matchIdCounter);
    this._matches[matchId] = new ElementalMatch(matchId);
    return { success: true, matchId: matchId };
  };

  ElementalArena.prototype.getMatch = function (matchId) {
    return this._matches[matchId] || null;
  };

  ElementalArena.prototype.addPlayerToMatch = function (matchId, playerId, deck) {
    var match = this._matches[matchId];
    if (!match) return { error: 'match_not_found' };
    if (match.status !== 'preparing') return { error: 'match_not_in_prep' };
    return match.addPlayer(playerId, deck);
  };

  ElementalArena.prototype.resolveMatchRound = function (matchId, card1Index, card2Index) {
    var match = this._matches[matchId];
    if (!match) return { error: 'match_not_found' };
    return match.resolveRound(card1Index, card2Index);
  };

  ElementalArena.prototype.getMatchSummary = function (matchId) {
    var match = this._matches[matchId];
    if (!match) return null;
    return match.getMatchSummary();
  };

  ElementalArena.prototype.getAllMatches = function () {
    var self = this;
    return Object.keys(this._matches).map(function (k) { return self._matches[k]; });
  };

  ElementalArena.prototype.getElementAdvantage = function (attackerElement, defenderElement) {
    return ElementAdvantage.getAdvantage(attackerElement, defenderElement);
  };

  ElementalArena.prototype.getAvailableElements = function () {
    return Object.keys(ElementType).map(function (k) { return ElementType[k]; });
  };

  // ----------------------------------------------------------------=======
  // Exports
  // ----------------------------------------------------------------=======
  window.ElementType = ElementType;
  window.ElementAdvantage = ElementAdvantage;
  window.ElementalCard = ElementalCard;
  window.ElementalMatch = ElementalMatch;
  window.ElementalArena = ElementalArena;
})();