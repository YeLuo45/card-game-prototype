// ============================================================================
// Card Deck Vault — V150 Direction B
// Secure card collection storage with categories and import/export
// thunderbolt offline-first + ruflo hook system + nanobot tool registry
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // VaultCard: Single card entry in vault
  // -----------------------------------------------------------------------
  function VaultCard(cardData, quantity) {
    this.id = cardData.id || cardData.cardId || ('vault_' + Date.now() + '_' + Math.random().toString(36).substr(2,5));
    this.name = cardData.name || 'Unknown Card';
    this.rarity = cardData.rarity || 'common';
    this.type = cardData.type || 'unit';
    this.power = cardData.power || 0;
    this.cost = cardData.cost || 0;
    this.quantity = quantity || 1;
    this.acquiredAt = Date.now();
    this.lastUsed = null;
    this.tags = cardData.tags || [];
    this.notes = cardData.notes || '';
    this.favorite = false;
  }

  VaultCard.prototype.use = function () {
    this.lastUsed = Date.now();
  };

  VaultCard.prototype.setFavorite = function (v) { this.favorite = v ? true : false; };

  VaultCard.prototype.addTag = function (tag) {
    if (this.tags.indexOf(tag) < 0) this.tags.push(tag);
  };

  VaultCard.prototype.setNotes = function (notes) { this.notes = notes; };

  // -----------------------------------------------------------------------
  // Vault: Main collection storage
  // -----------------------------------------------------------------------
  function Vault(storageKey) {
    this.storageKey = storageKey || 'deck_vault';
    this._cards = {}; // id -> VaultCard
    this._categories = ['all', 'favorites', 'units', 'spells', 'rare', 'epic', 'legendary'];
    this._stats = { totalCards: 0, totalQuantity: 0, favoriteCount: 0 };
    this._init();
  }

  Vault.prototype._init = function () { this._load(); };

  Vault.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._cards = data.cards || {};
          this._stats = data.stats || this._stats;
        }
      }
    } catch (e) {}
  };

  Vault.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          cards: this._cards,
          stats: this._stats
        }));
      }
    } catch (e) {}
  };

  Vault.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) console.log('[Vault] ' + msg);
  };

  Vault.prototype._recalcStats = function () {
    var totalCards = 0, totalQuantity = 0, favoriteCount = 0;
    for (var id in this._cards) {
      var c = this._cards[id];
      totalCards++;
      totalQuantity += c.quantity;
      if (c.favorite) favoriteCount++;
    }
    this._stats.totalCards = totalCards;
    this._stats.totalQuantity = totalQuantity;
    this._stats.favoriteCount = favoriteCount;
  };

  // Add card to vault
  Vault.prototype.addCard = function (cardData, quantity) {
    var qty = quantity || 1;
    var id = cardData.id || cardData.cardId;
    if (this._cards[id]) {
      this._cards[id].quantity += qty;
    } else {
      this._cards[id] = new VaultCard(cardData, qty);
    }
    this._recalcStats();
    this._save();
    this._log('Added card: ' + id + ' x' + qty);
    return { success: true, quantity: this._cards[id].quantity };
  };

  // Remove card from vault
  Vault.prototype.removeCard = function (cardId, quantity) {
    var c = this._cards[cardId];
    if (!c) return { error: 'card_not_found' };
    var qty = quantity || 1;
    if (c.quantity <= qty) {
      delete this._cards[cardId];
    } else {
      c.quantity -= qty;
    }
    this._recalcStats();
    this._save();
    return { success: true };
  };

  // Get card
  Vault.prototype.getCard = function (cardId) {
    return this._cards[cardId] || null;
  };

  // List all cards
  Vault.prototype.listCards = function (filters) {
    var result = [];
    for (var id in this._cards) {
      var c = this._cards[id];
      if (filters) {
        if (filters.rarity && c.rarity !== filters.rarity) continue;
        if (filters.type && c.type !== filters.type) continue;
        if (filters.favorite && !c.favorite) continue;
        if (filters.tag && c.tags.indexOf(filters.tag) < 0) continue;
        if (filters.search && c.name.toLowerCase().indexOf(filters.search.toLowerCase()) < 0) continue;
      }
      result.push(c);
    }
    // Sort: favorites first, then by name
    return result.sort(function (a, b) {
      if (a.favorite !== b.favorite) return b.favorite ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  };

  // Toggle favorite
  Vault.prototype.toggleFavorite = function (cardId) {
    var c = this._cards[cardId];
    if (!c) return { error: 'card_not_found' };
    c.setFavorite(!c.favorite);
    this._recalcStats();
    this._save();
    return { success: true, favorite: c.favorite };
  };

  // Get stats
  Vault.prototype.getStats = function () { return this._stats; };

  // Search cards
  Vault.prototype.search = function (query) {
    return this.listCards({ search: query });
  };

  // Import cards from JSON
  Vault.prototype.importCards = function (cardsArray) {
    var imported = 0;
    for (var i = 0; i < cardsArray.length; i++) {
      var r = this.addCard(cardsArray[i].card || cardsArray[i], cardsArray[i].quantity || 1);
      if (r.success) imported++;
    }
    this._recalcStats();
    this._save();
    return { success: true, imported: imported };
  };

  // Export cards to JSON
  Vault.prototype.exportCards = function () {
    var exported = [];
    for (var id in this._cards) {
      exported.push({
        cardId: id,
        name: this._cards[id].name,
        rarity: this._cards[id].rarity,
        type: this._cards[id].type,
        power: this._cards[id].power,
        cost: this._cards[id].cost,
        quantity: this._cards[id].quantity
      });
    }
    return exported;
  };

  // Clear vault
  Vault.prototype.clear = function () {
    this._cards = {};
    this._recalcStats();
    this._save();
    return { success: true };
  };

  // Get categories
  Vault.prototype.getCategories = function () {
    return this._categories.slice();
  };

  // Add category
  Vault.prototype.addCategory = function (name) {
    if (this._categories.indexOf(name) >= 0) return { error: 'category_exists' };
    this._categories.push(name);
    return { success: true };
  };

  // --------------------------------------------------------------------===
  // DeckBuilder: Builds decks from vault cards
  // ========================================================================
  function DeckBuilder(vault) {
    this.vault = vault;
    this.currentDeck = [];
    this.maxSize = 30;
    this.name = 'New Deck';
  }

  DeckBuilder.prototype.addToDeck = function (cardId) {
    var c = this.vault.getCard(cardId);
    if (!c) return { error: 'card_not_found' };
    if (c.quantity < 1) return { error: 'insufficient_quantity' };
    if (this.currentDeck.length >= this.maxSize) return { error: 'deck_full' };

    // Count copies in deck
    var copies = this.currentDeck.filter(function (id) { return id === cardId; }).length;
    if (copies >= 2) return { error: 'too_many_copies' };

    this.currentDeck.push(cardId);
    c.use();
    return { success: true, deckSize: this.currentDeck.length };
  };

  DeckBuilder.prototype.removeFromDeck = function (cardId) {
    var idx = this.currentDeck.indexOf(cardId);
    if (idx < 0) return { error: 'card_not_in_deck' };
    this.currentDeck.splice(idx, 1);
    return { success: true, deckSize: this.currentDeck.length };
  };

  DeckBuilder.prototype.getDeck = function () {
    return this.currentDeck.slice();
  };

  DeckBuilder.prototype.getDeckWithCards = function () {
    var self = this;
    return this.currentDeck.map(function (id) {
      var c = self.vault.getCard(id);
      return c ? { id: c.id, name: c.name, rarity: c.rarity, power: c.power, cost: c.cost } : null;
    }).filter(function (c) { return c !== null; });
  };

  DeckBuilder.prototype.isValid = function () {
    return this.currentDeck.length >= 15 && this.currentDeck.length <= this.maxSize;
  };

  DeckBuilder.prototype.clearDeck = function () {
    this.currentDeck = [];
  };

  DeckBuilder.prototype.setName = function (name) { this.name = name; };

  // --------------------------------------------------------------------===
  // Exports
  // -----------------------------------------------------------------------
  window.VaultCard = VaultCard;
  window.Vault = Vault;
  window.DeckBuilder = DeckBuilder;
})();