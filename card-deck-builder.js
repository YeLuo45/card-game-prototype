// ============================================================================
// Card Deck Builder — V145 Direction B
// Interactive deck construction with validation and statistics
// ruflo hook system + chatdev multi-agent + nanobot tool registry
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // Card: Basic card definition
  // -----------------------------------------------------------------------
  function Card(id, name, cost, power, toughness, rarity, color, tags) {
    this.id = id;
    this.name = name || 'Unknown';
    this.cost = cost || 0;
    this.power = power || 0;
    this.toughness = toughness || 0;
    this.rarity = rarity || 'common';
    this.color = color || 'neutral';
    this.tags = tags || [];
  }

  Card.prototype.clone = function () {
    return new Card(this.id, this.name, this.cost, this.power, this.toughness, this.rarity, this.color, this.tags.slice());
  };

  // -----------------------------------------------------------------------
  // DeckValidator: Hook-based validation system
  // -----------------------------------------------------------------------
  function DeckValidator() {
    this._hooks = {};
    this._rules = [];
    this._init();
  }

  DeckValidator.prototype._init = function () {
    // Default rules
    this.addRule('min_cards', function (deck) {
      return deck.cards.length >= 20 ? null : 'deck must have at least 20 cards';
    });
    this.addRule('max_cards', function (deck) {
      return deck.cards.length <= 60 ? null : 'deck cannot exceed 60 cards';
    });
    this.addRule('max_copies', function (deck) {
      var counts = {};
      for (var i = 0; i < deck.cards.length; i++) {
        var id = deck.cards[i].id;
        counts[id] = (counts[id] || 0) + 1;
        if (counts[id] > 4) return 'max 4 copies of each card (rule: ' + id + ')';
      }
      return null;
    });
    this.addRule('legendary_limit', function (deck) {
      var legendary = deck.cards.filter(function (c) { return c.rarity === 'legendary'; });
      if (legendary.length > 6) return 'max 6 legendary cards';
      return null;
    });
  };

  DeckValidator.prototype.addRule = function (name, fn) {
    this._rules.push({ name: name, fn: fn });
  };

  DeckValidator.prototype.addHook = function (event, fn) {
    if (!this._hooks[event]) this._hooks[event] = [];
    this._hooks[event].push(fn);
  };

  DeckValidator.prototype._emit = function (event, data) {
    var arr = this._hooks[event] || [];
    for (var i = 0; i < arr.length; i++) arr[i](data);
  };

  DeckValidator.prototype.validate = function (deck) {
    this._emit('before_validate', { deck: deck });
    var errors = [];
    for (var i = 0; i < this._rules.length; i++) {
      var r = this._rules[i].fn(deck);
      if (r) errors.push({ rule: this._rules[i].name, message: r });
    }
    this._emit('after_validate', { deck: deck, errors: errors });
    return {
      valid: errors.length === 0,
      errors: errors
    };
  };

  // -----------------------------------------------------------------------
  // DeckBuilder: Main deck building interface
  // -----------------------------------------------------------------------
  function DeckBuilder() {
    this._decks = {};
    this._activeDeckId = null;
    this._validator = new DeckValidator();
    this._stats = { created: 0, validated: 0, saved: 0 };
    this._init();
  }

  DeckBuilder.prototype._init = function () {
    var self = this;
    this._validator.addHook('before_validate', function (data) {
      self._stats.validated++;
    });
    this._validator.addHook('after_validate', function (data) {
      if (data.errors.length === 0) {
        self._stats.saved++;
      }
    });
  };

  DeckBuilder.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) console.log('[DeckBuilder] ' + msg);
  };

  // Create a new deck
  DeckBuilder.prototype.createDeck = function (name, description) {
    if (!name) return { error: 'name_required' };
    var id = 'deck_' + Date.now();
    var deck = {
      id: id,
      name: name,
      description: description || '',
      cards: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this._decks[id] = deck;
    this._stats.created++;
    this._log('Created deck: ' + name + ' (' + id + ')');
    return { success: true, deckId: id };
  };

  // Add card to deck
  DeckBuilder.prototype.addCard = function (deckId, card) {
    var deck = this._decks[deckId];
    if (!deck) return { error: 'deck_not_found' };

    // Hook before add
    var ctx = { deck: deck, card: card, allowed: true };
    this._emit('before_add', ctx);
    if (!ctx.allowed) return { error: 'not_allowed', reason: ctx.reason };

    deck.cards.push(card.clone());
    deck.updatedAt = Date.now();
    this._log('Added ' + card.name + ' to ' + deck.name);
    return { success: true, count: deck.cards.length };
  };

  // Remove card from deck
  DeckBuilder.prototype.removeCard = function (deckId, cardIndex) {
    var deck = this._decks[deckId];
    if (!deck) return { error: 'deck_not_found' };
    if (cardIndex < 0 || cardIndex >= deck.cards.length) return { error: 'invalid_index' };

    var removed = deck.cards.splice(cardIndex, 1)[0];
    deck.updatedAt = Date.now();
    this._log('Removed ' + removed.name + ' from ' + deck.name);
    return { success: true, card: removed };
  };

  // Validate deck
  DeckBuilder.prototype.validateDeck = function (deckId) {
    var deck = this._decks[deckId];
    if (!deck) return { error: 'deck_not_found' };
    return this._validator.validate(deck);
  };

  // Get deck info
  DeckBuilder.prototype.getDeck = function (deckId) {
    var deck = this._decks[deckId];
    if (!deck) return null;
    return {
      id: deck.id,
      name: deck.name,
      description: deck.description,
      cardCount: deck.cards.length,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt
    };
  };

  // Get all deck IDs
  DeckBuilder.prototype.listDecks = function () {
    var result = [];
    for (var id in this._decks) {
      var d = this._decks[id];
      result.push({
        id: d.id,
        name: d.name,
        cardCount: d.cards.length,
        updatedAt: d.updatedAt
      });
    }
    return result;
  };

  // Delete deck
  DeckBuilder.prototype.deleteDeck = function (deckId) {
    if (!this._decks[deckId]) return { error: 'deck_not_found' };
    delete this._decks[deckId];
    this._log('Deleted deck: ' + deckId);
    return { success: true };
  };

  // Duplicate deck
  DeckBuilder.prototype.duplicateDeck = function (deckId, newName) {
    var deck = this._decks[deckId];
    if (!deck) return { error: 'deck_not_found' };

    var result = this.createDeck(newName || (deck.name + ' Copy'), deck.description);
    if (!result.success) return result;

    for (var i = 0; i < deck.cards.length; i++) {
      this._decks[result.deckId].cards.push(deck.cards[i].clone());
    }
    return result;
  };

  // Export deck as JSON
  DeckBuilder.prototype.exportDeck = function (deckId) {
    var deck = this._decks[deckId];
    if (!deck) return { error: 'deck_not_found' };
    return JSON.stringify(deck);
  };

  // Import deck from JSON
  DeckBuilder.prototype.importDeck = function (jsonStr) {
    try {
      var deck = JSON.parse(jsonStr);
      if (!deck.id || !deck.name) return { error: 'invalid_format' };
      this._decks[deck.id] = deck;
      return { success: true, deckId: deck.id };
    } catch (e) {
      return { error: 'parse_error' };
    }
  };

  // Add hook
  DeckBuilder.prototype.addHook = function (event, fn) {
    if (!this._hooks) this._hooks = {};
    if (!this._hooks[event]) this._hooks[event] = [];
    this._hooks[event].push(fn);
  };

  DeckBuilder.prototype._emit = function (event, data) {
    var arr = (this._hooks && this._hooks[event]) || [];
    for (var i = 0; i < arr.length; i++) arr[i](data);
  };

  // Get builder stats
  DeckBuilder.prototype.getStats = function () {
    var total = Object.keys(this._decks).length;
    var totalCards = 0;
    for (var id in this._decks) totalCards += this._decks[id].cards.length;
    return {
      decks: total,
      totalCards: totalCards,
      created: this._stats.created,
      validated: this._stats.validated,
      saved: this._stats.saved
    };
  };

  // -----------------------------------------------------------------------
  // DeckStatistics: Analysis of deck composition
  // -----------------------------------------------------------------------
  function DeckStatistics() {}

  DeckStatistics.prototype.analyze = function (deck) {
    var cards = deck.cards || [];

    // Mana curve
    var manaCurve = {};
    for (var i = 0; i <= 7; i++) manaCurve[i] = 0;
    manaCurve['7+'] = 0;
    for (var j = 0; j < cards.length; j++) {
      var cost = cards[j].cost;
      if (cost >= 7) manaCurve['7+']++;
      else manaCurve[cost]++;
    }

    // Color distribution
    var colors = {};
    for (var k = 0; k < cards.length; k++) {
      var color = cards[k].color;
      colors[color] = (colors[color] || 0) + 1;
    }

    // Rarity distribution
    var rarities = {};
    for (var m = 0; m < cards.length; m++) {
      var rarity = cards[m].rarity;
      rarities[rarity] = (rarities[rarity] || 0) + 1;
    }

    // Tag analysis
    var tagCounts = {};
    for (var n = 0; n < cards.length; n++) {
      for (var t = 0; t < cards[n].tags.length; t++) {
        var tag = cards[n].tags[t];
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    // Average stats
    var totalPower = 0, totalToughness = 0;
    for (var p = 0; p < cards.length; p++) {
      totalPower += cards[p].power || 0;
      totalToughness += cards[p].toughness || 0;
    }
    var avgPower = cards.length > 0 ? (totalPower / cards.length).toFixed(1) : 0;
    var avgToughness = cards.length > 0 ? (totalToughness / cards.length).toFixed(1) : 0;

    return {
      cardCount: cards.length,
      manaCurve: manaCurve,
      colors: colors,
      rarities: rarities,
      tags: tagCounts,
      avgPower: parseFloat(avgPower),
      avgToughness: parseFloat(avgToughness),
      balance: this._calculateBalance(colors, manaCurve)
    };
  };

  DeckStatistics.prototype._calculateBalance = function (colors, manaCurve) {
    var colorKeys = Object.keys(colors);
    var colorScore = colorKeys.length > 2 ? 80 : (colorKeys.length > 1 ? 95 : 70);

    var curveKeys = Object.keys(manaCurve).filter(function (k) { return manaCurve[k] > 0; }).length;
    var curveScore = Math.min(curveKeys * 15, 90);

    return Math.min(colorScore + curveScore - 80, 100);
  };

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------
  window.Card = Card;
  window.DeckValidator = DeckValidator;
  window.DeckBuilder = DeckBuilder;
  window.DeckStatistics = DeckStatistics;
})();