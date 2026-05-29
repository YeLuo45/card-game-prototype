// ============================================================================
// Card Deck Builder Pro — V167 Direction B
// Advanced deck builder with mana curve analysis and card suggestions
// chatdev role specialization + ruflo hierarchical decomposition
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // Card: Individual card definition
  // ========================================================================
  function Card(id, name, manaCost, cardType, attack, health, abilities) {
    this.id = id;
    this.name = name || id;
    this.manaCost = manaCost || 0;
    this.cardType = cardType || 'creature';
    this.attack = attack || 0;
    this.health = health || 0;
    this.abilities = abilities || [];
  }

  Card.prototype.getEffectiveCost = function () {
    var effective = this.manaCost;
    if (this.abilities.indexOf('battlecry') >= 0) effective -= 1;
    if (this.abilities.indexOf('deathrattle') >= 0) effective -= 0.5;
    return Math.max(0, effective);
  };

  Card.prototype.isPlayable = function (currentMana) {
    return currentMana >= this.manaCost;
  };

  // --------------------------------------------------------------------===
  // DeckBuilder: Advanced deck construction
  // ========================================================================
  function DeckBuilder(name, format) {
    this.name = name || 'Unnamed Deck';
    this.format = format || 'standard';
    this.cards = []; // array of { card, count }
    this._cardMap = {}; // cardId -> index
    this.minSize = 20;
    this.maxSize = 30;
  }

  DeckBuilder.prototype._findCard = function (cardId) {
    return this._cardMap[cardId];
  };

  DeckBuilder.prototype._addCardEntry = function (card, count) {
    count = count || 1;
    var idx = this._findCard(card.id);
    if (idx !== undefined) {
      this.cards[idx].count += count;
    } else {
      this._cardMap[card.id] = this.cards.length;
      this.cards.push({ card: card, count: count });
    }
    return { success: true, totalCards: this.getTotalCards() };
  };

  DeckBuilder.prototype.addCard = function (card, count) {
    var total = this.getTotalCards();
    if (total >= this.maxSize) return { error: 'deck_full' };
    var existing = this._findCard(card.id);
    if (existing !== undefined && this.cards[existing].count >= 2) {
      return { error: 'too_many_copies' };
    }
    return this._addCardEntry(card, count);
  };

  DeckBuilder.prototype.removeCard = function (cardId, count) {
    var idx = this._findCard(cardId);
    if (idx === undefined) return { error: 'card_not_in_deck' };
    var removed = Math.min(count || 1, this.cards[idx].count);
    this.cards[idx].count -= removed;
    if (this.cards[idx].count <= 0) {
      this.cards.splice(idx, 1);
      delete this._cardMap[cardId];
    }
    return { success: true, totalCards: this.getTotalCards() };
  };

  DeckBuilder.prototype.getTotalCards = function () {
    var total = 0;
    for (var i = 0; i < this.cards.length; i++) total += this.cards[i].count;
    return total;
  };

  DeckBuilder.prototype.getUniqueCards = function () {
    return this.cards.length;
  };

  DeckBuilder.prototype.isValid = function () {
    return this.getTotalCards() >= this.minSize;
  };

  DeckBuilder.prototype.getManaCurve = function () {
    var curve = {};
    for (var i = 0; i <= 20; i++) curve[i] = 0;
    for (var i = 0; i < this.cards.length; i++) {
      var entry = this.cards[i];
      var cost = entry.card.manaCost;
      if (cost > 20) cost = 20;
      curve[cost] = (curve[cost] || 0) + entry.count;
    }
    return curve;
  };

  DeckBuilder.prototype.getAverageManaCost = function () {
    var totalCards = this.getTotalCards();
    if (totalCards === 0) return 0;
    var weightedSum = 0;
    for (var i = 0; i < this.cards.length; i++) {
      weightedSum += this.cards[i].card.manaCost * this.cards[i].count;
    }
    return Math.round((weightedSum / totalCards) * 100) / 100;
  };

  DeckBuilder.prototype.getCardsByType = function (cardType) {
    var result = [];
    for (var i = 0; i < this.cards.length; i++) {
      if (this.cards[i].card.cardType === cardType) {
        result.push(this.cards[i]);
      }
    }
    return result;
  };

  DeckBuilder.prototype.getDeck = function () {
    var result = [];
    for (var i = 0; i < this.cards.length; i++) {
      for (var j = 0; j < this.cards[i].count; j++) {
        result.push(this.cards[i].card.id);
      }
    }
    return result;
  };

  DeckBuilder.prototype.getStats = function () {
    var totalCards = this.getTotalCards();
    var manaCurve = this.getManaCurve();
    var maxCurveSlot = 0;
    for (var c in manaCurve) if (manaCurve[c] > 0) maxCurveSlot = Math.max(maxCurveSlot, parseInt(c));
    return {
      name: this.name,
      totalCards: totalCards,
      uniqueCards: this.getUniqueCards(),
      isValid: this.isValid(),
      averageManaCost: this.getAverageManaCost(),
      curve: manaCurve,
      maxManaCost: maxCurveSlot
    };
  };

  // ----------------------------------------------------------------=======
  // DeckCollection: Collection of deck builders
  // ========================================================================
  function DeckCollection(storageKey) {
    this.storageKey = storageKey || 'deck_collection';
    this._decks = {}; // name -> DeckBuilder
    this._init();
  }

  DeckCollection.prototype._init = function () {
    this._load();
  };

  DeckCollection.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) { var data = JSON.parse(raw); }
      }
    } catch (e) {}
  };

  DeckCollection.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[DeckCollection] ' + msg);
    }
  };

  DeckCollection.prototype.createDeck = function (name, format) {
    if (this._decks[name]) return { error: 'deck_exists' };
    this._decks[name] = new DeckBuilder(name, format);
    return { success: true, deckName: name };
  };

  DeckCollection.prototype.getDeck = function (name) {
    return this._decks[name] || null;
  };

  DeckCollection.prototype.deleteDeck = function (name) {
    if (!this._decks[name]) return { error: 'deck_not_found' };
    delete this._decks[name];
    return { success: true };
  };

  DeckCollection.prototype.listDecks = function () {
    var names = [];
    for (var n in this._decks) names.push(n);
    return names;
  };

  DeckCollection.prototype.suggestCards = function (deckName, allCards, pool) {
    var deck = this._decks[deckName];
    if (!deck) return { error: 'deck_not_found' };
    var curve = deck.getManaCurve();
    var suggestions = [];
    for (var i = 0; i < pool.length; i++) {
      var card = pool[i];
      var cost = card.manaCost;
      var countInDeck = deck._findCard(card.id) !== undefined ? deck.cards[deck._findCard(card.id)].count : 0;
      if (countInDeck >= 2) continue;
      var curveWeight = curve[cost] || 0;
      var score = Math.max(1, 5 - curveWeight);
      suggestions.push({ card: card, score: score });
    }
    suggestions.sort(function (a, b) { return b.score - a.score; });
    return suggestions.slice(0, 5);
  };

  // ----------------------------------------------------------------=======
  // Exports
  // ----------------------------------------------------------------=======
  window.Card = Card;
  window.DeckBuilder = DeckBuilder;
  window.DeckCollection = DeckCollection;
})();