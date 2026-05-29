// ============================================================================
// Card Collection Vault — V179 Direction D
// Card collection management with storage, organization and trading
// generic-agent autonomous goal pursuit + nanobot distributed mesh
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // CardEntry: A single card entry in the collection
  // ========================================================================
  function CardEntry(cardId, name, rarity, element, owned, tradeable, notes) {
    this.cardId = cardId;
    this.name = name || cardId;
    this.rarity = rarity || 'common'; // common, uncommon, rare, epic, legendary
    this.element = element || 'neutral';
    this.owned = owned !== undefined ? owned : true;
    this.tradeable = tradeable !== undefined ? tradeable : false;
    this.notes = notes || '';
    this.quantity = 1;
    this.acquiredAt = Date.now();
  }

  CardEntry.prototype.getValue = function () {
    var base = this.rarity === 'legendary' ? 1000 : this.rarity === 'epic' ? 500 :
      this.rarity === 'rare' ? 100 : this.rarity === 'uncommon' ? 25 : 5;
    return base * this.quantity;
  };

  CardEntry.prototype.setTradeable = function (value) {
    this.tradeable = value;
    return { success: true, tradeable: this.tradeable };
  };

  // --------------------------------------------------------------------===
  // CollectionVault: Manages the card collection
  // ========================================================================
  function CollectionVault(storageKey) {
    this.storageKey = storageKey || 'collection_vault';
    this._entries = {}; // cardId -> CardEntry
    this._categories = ['all', 'owned', 'tradeable', 'legendary', 'epic', 'rare', 'uncommon', 'common'];
    this._init();
  }

  CollectionVault.prototype._init = function () {
    this._load();
    if (Object.keys(this._entries).length === 0) {
      this._seedDefaultCollection();
    }
  };

  CollectionVault.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._entries = data.entries || {};
        }
      }
    } catch (e) {}
  };

  CollectionVault.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({ entries: this._entries }));
      }
    } catch (e) {}
  };

  CollectionVault.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[CollectionVault] ' + msg);
    }
  };

  CollectionVault.prototype._seedDefaultCollection = function () {
    var defaults = [
      new CardEntry('c_fire_1', 'Flame Imp', 'common', 'fire'),
      new CardEntry('c_water_1', 'Aqua Sprite', 'common', 'water'),
      new CardEntry('c_earth_1', 'Stone Golem', 'common', 'earth'),
      new CardEntry('c_fire_r', 'Fire Mage', 'rare', 'fire'),
      new CardEntry('c_light_e', 'Radiant Angel', 'epic', 'light'),
      new CardEntry('c_legendary_1', 'Dragon Lord', 'legendary', 'fire')
    ];
    for (var i = 0; i < defaults.length; i++) {
      this._entries[defaults[i].cardId] = defaults[i];
    }
  };

  CollectionVault.prototype.addCard = function (cardId, name, rarity, element, options) {
    if (this._entries[cardId]) return { error: 'already_exists' };
    var entry = new CardEntry(cardId, name, rarity, element, true, false, '');
    if (options) {
      if (options.quantity !== undefined) entry.quantity = options.quantity;
      if (options.tradeable !== undefined) entry.tradeable = options.tradeable;
      if (options.notes !== undefined) entry.notes = options.notes;
    }
    this._entries[cardId] = entry;
    this._save();
    return { success: true, entry: entry };
  };

  CollectionVault.prototype.getCard = function (cardId) {
    return this._entries[cardId] || null;
  };

  CollectionVault.prototype.getAllCards = function () {
    var result = [];
    for (var cardId in this._entries) {
      result.push(this._entries[cardId]);
    }
    return result;
  };

  CollectionVault.prototype.getCardsByRarity = function (rarity) {
    var result = [];
    for (var cardId in this._entries) {
      if (this._entries[cardId].rarity === rarity) result.push(this._entries[cardId]);
    }
    return result;
  };

  CollectionVault.prototype.getOwnedCards = function () {
    var result = [];
    for (var cardId in this._entries) {
      if (this._entries[cardId].owned) result.push(this._entries[cardId]);
    }
    return result;
  };

  CollectionVault.prototype.getTradeableCards = function () {
    var result = [];
    for (var cardId in this._entries) {
      if (this._entries[cardId].tradeable) result.push(this._entries[cardId]);
    }
    return result;
  };

  CollectionVault.prototype.getCollectionValue = function () {
    var total = 0;
    for (var cardId in this._entries) {
      total += this._entries[cardId].getValue();
    }
    return total;
  };

  CollectionVault.prototype.removeCard = function (cardId) {
    if (!this._entries[cardId]) return { error: 'card_not_found' };
    delete this._entries[cardId];
    this._save();
    return { success: true };
  };

  CollectionVault.prototype.updateCardQuantity = function (cardId, quantity) {
    var entry = this._entries[cardId];
    if (!entry) return { error: 'card_not_found' };
    entry.quantity = Math.max(0, quantity);
    if (entry.quantity === 0) entry.owned = false;
    this._save();
    return { success: true, quantity: entry.quantity };
  };

  CollectionVault.prototype.searchCards = function (query) {
    var result = [];
    var q = (query || '').toLowerCase();
    for (var cardId in this._entries) {
      var e = this._entries[cardId];
      if (e.name.toLowerCase().indexOf(q) >= 0 || e.cardId.toLowerCase().indexOf(q) >= 0) {
        result.push(e);
      }
    }
    return result;
  };

  CollectionVault.prototype.getRarityCounts = function () {
    var counts = { legendary: 0, epic: 0, rare: 0, uncommon: 0, common: 0 };
    for (var cardId in this._entries) {
      var r = this._entries[cardId].rarity;
      if (counts[r] !== undefined) counts[r]++;
    }
    return counts;
  };

  // --------------------------------------------------------------------===
  // Exports
  // ----------------------------------------------------------------=======
  window.CardEntry = CardEntry;
  window.CollectionVault = CollectionVault;
})();