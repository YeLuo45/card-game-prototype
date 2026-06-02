// ============================================================================
// Card Sealed Deck Arena — V164 Direction C
// Sealed deck format where players build from random card pools
// chatdev + nanobot + thunderbolt
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // CardPool: Random pool of cards for sealed deck
  // ========================================================================
  function CardPool(cards) {
    this.cards = cards || [];
    this.remaining = cards ? cards.slice() : [];
  }

  CardPool.prototype.draw = function (count) {
    var drawn = this.remaining.splice(0, count);
    return drawn;
  };

  CardPool.prototype.drawRandom = function (count) {
    var shuffled = this.remaining.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
    }
    var drawn = shuffled.splice(0, count);
    var drawnMap = {};
    for (var k = 0; k < drawn.length; k++) drawnMap[drawn[k]] = true;
    this.remaining = this.remaining.filter(function(c) { return !drawnMap[c]; });
    return drawn;
  };

  CardPool.prototype.getRemaining = function () {
    return this.remaining.slice();
  };

  CardPool.prototype.getCount = function () {
    return this.remaining.length;
  };

  // --------------------------------------------------------------------===
  // SealedDeckBuilder: Build sealed deck from pool
  // ========================================================================
  function SealedDeckBuilder(minSize, maxSize) {
    this.minSize = minSize || 40;
    this.maxSize = maxSize || 60;
    this.deck = []; // array of card ids
    this.sideboard = []; // array of card ids
  }

  SealedDeckBuilder.prototype.addToDeck = function (cardId) {
    if (this.deck.indexOf(cardId) >= 0) return { error: 'already_in_deck' };
    if (this.deck.length >= this.maxSize) return { error: 'deck_full' };
    this.deck.push(cardId);
    return { success: true, deckSize: this.deck.length };
  };

  SealedDeckBuilder.prototype.removeFromDeck = function (cardId) {
    var idx = this.deck.indexOf(cardId);
    if (idx < 0) return { error: 'not_in_deck' };
    this.deck.splice(idx, 1);
    return { success: true, deckSize: this.deck.length };
  };

  SealedDeckBuilder.prototype.addToSideboard = function (cardId) {
    if (this.sideboard.indexOf(cardId) >= 0) return { error: 'already_in_sideboard' };
    this.sideboard.push(cardId);
    return { success: true };
  };

  SealedDeckBuilder.prototype.moveToSideboard = function (cardId) {
    var idx = this.deck.indexOf(cardId);
    if (idx < 0) return { error: 'not_in_deck' };
    this.deck.splice(idx, 1);
    this.sideboard.push(cardId);
    return { success: true };
  };

  SealedDeckBuilder.prototype.moveToDeck = function (cardId) {
    var idx = this.sideboard.indexOf(cardId);
    if (idx < 0) return { error: 'not_in_sideboard' };
    this.sideboard.splice(idx, 1);
    this.deck.push(cardId);
    return { success: true };
  };

  SealedDeckBuilder.prototype.isValid = function () {
    return this.deck.length >= this.minSize;
  };

  SealedDeckBuilder.prototype.getDeck = function () {
    return this.deck.slice();
  };

  SealedDeckBuilder.prototype.getSideboard = function () {
    return this.sideboard.slice();
  };

  SealedDeckBuilder.prototype.getStats = function () {
    return {
      deckSize: this.deck.length,
      sideboardSize: this.sideboard.length,
      isValid: this.isValid(),
      minRequired: this.minSize
    };
  };

  // --------------------------------------------------------------------===
  // SealedArena: Manages sealed deck events
  // ========================================================================
  function SealedArena(storageKey) {
    this.storageKey = storageKey || 'sealed_arena';
    this._pools = []; // array of CardPool
    this._builders = {}; // playerId -> SealedDeckBuilder
    this._activePool = null; // index of current pool
    this._stats = { totalDrafts: 0, bestRunWins: 0 };
    this._init();
  }

  SealedArena.prototype._init = function () {
    this._load();
  };

  SealedArena.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._stats = data.stats || this._stats;
        }
      }
    } catch (e) {}
  };

  SealedArena.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          stats: this._stats
        }));
      }
    } catch (e) {}
  };

  SealedArena.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[SealedArena] ' + msg);
    }
  };

  // Generate a sealed pool from allCardIds
  SealedArena.prototype.generatePool = function (allCardIds, poolSize) {
    var size = poolSize || 90;
    var pool = allCardIds ? allCardIds.slice() : this._defaultCardIds();
    // Shuffle and take poolSize
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    var selected = pool.slice(0, Math.min(size, pool.length));
    var cardPool = new CardPool(selected);
    this._pools.push(cardPool);
    this._activePool = this._pools.length - 1;
    this._stats.totalDrafts++;
    this._save();
    return cardPool;
  };

  SealedArena.prototype._defaultCardIds = function () {
    var ids = [];
    for (var i = 1; i <= 100; i++) ids.push('card_' + i);
    return ids;
  };

  SealedArena.prototype.getCurrentPool = function () {
    return this._pools[this._activePool] || null;
  };

  SealedArena.prototype.getPlayerBuilder = function (playerId) {
    if (!this._builders[playerId]) {
      this._builders[playerId] = new SealedDeckBuilder();
    }
    return this._builders[playerId];
  };

  SealedArena.prototype.recordMatchResult = function (playerId, wins, losses) {
    if (!this._builders[playerId]) return { error: 'no_builder' };
    if (wins > this._stats.bestRunWins) this._stats.bestRunWins = wins;
    this._save();
    return { success: true };
  };

  SealedArena.prototype.getStats = function () {
    return {
      totalDrafts: this._stats.totalDrafts,
      bestRunWins: this._stats.bestRunWins,
      poolCount: this._pools.length,
      builderCount: Object.keys(this._builders).length
    };
  };

  SealedArena.prototype.getLeaderboard = function () {
    var entries = [];
    for (var pid in this._builders) {
      var b = this._builders[pid];
      entries.push({
        playerId: pid,
        deckSize: b.deck.length,
        valid: b.isValid(),
        sideboardSize: b.sideboard.length
      });
    }
    entries.sort(function (a, b) { return b.deckSize - a.deckSize; });
    return entries;
  };

  // --------------------------------------------------------------------===
  // Exports
  // ----------------------------------------------------------------=======
  window.CardPool = CardPool;
  window.SealedDeckBuilder = SealedDeckBuilder;
  window.SealedArena = SealedArena;
})();