// ============================================================================
// Card Spell Runes — V154 Direction A
// Rune-based spell casting system with elemental combos and cooldown
// nanobot distributed mesh + thunderbolt offline-first + ruflo hooks
// ============================================================================
'use strict';

(function () {
  // -----------------------------------------------------------------------
  // Rune: Inscribed magical symbol
  // -----------------------------------------------------------------------
  function Rune(id, name, element, power, cooldown, description) {
    this.id = id || '';
    this.name = name || '';
    this.element = element || 'neutral'; // fire | water | earth | air | light | dark | neutral
    this.power = power || 1;
    this.cooldown = cooldown || 0;
    this.currentCooldown = 0;
    this.description = description || '';
    this.inscribed = false;
    this.inscribedAt = null;
  }

  Rune.prototype.inscribe = function () {
    this.inscribed = true;
    this.inscribedAt = Date.now();
  };

  Rune.prototype.getElementMult = function () {
    var mults = { fire: 2, water: 2, earth: 2, air: 2, light: 3, dark: 3, neutral: 1 };
    return mults[this.element] || 1;
  };

  Rune.prototype.getEffectivePower = function () {
    return this.power * this.getElementMult();
  };

  // --------------------------------------------------------------------===
  // RuneInscription: Inscribed rune on a card
  // ========================================================================
  function RuneInscription(rune, slot, carvedBy) {
    this.runeId = rune.id;
    this.runeName = rune.name;
    this.slot = slot || 0;
    this.carvedBy = carvedBy || 'unknown';
    this.inscribedAt = Date.now();
    this.element = rune.element;
    this.power = rune.power;
  }

  // --------------------------------------------------------------------===
  // SpellRuneManager: Manages rune library and inscription
  // ========================================================================
  function SpellRuneManager(storageKey) {
    this.storageKey = storageKey || 'spell_runes';
    this._runes = {};         // id -> Rune
    this._inscriptions = [];  // array of RuneInscription
    this._stats = { totalInscriptions: 0, elementalCombos: 0 };
    this._cooldowns = {};    // runeId -> turns remaining
    this._init();
  }

  SpellRuneManager.prototype._init = function () {
    this._load();
    if (Object.keys(this._runes).length === 0) this._generateDefaultRunes();
  };

  SpellRuneManager.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._runes = data.runes || {};
          this._inscriptions = data.inscriptions || [];
          this._stats = data.stats || this._stats;
        }
      }
    } catch (e) {}
  };

  SpellRuneManager.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          runes: this._runes,
          inscriptions: this._inscriptions,
          stats: this._stats
        }));
      }
    } catch (e) {}
  };

  SpellRuneManager.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) console.log('[SpellRuneManager] ' + msg);
  };

  SpellRuneManager.prototype._generateDefaultRunes = function () {
    var defaultRunes = [
      new Rune('rune_fire', 'Fire Rune', 'fire', 5, 2, 'Burns enemies with fire'),
      new Rune('rune_water', 'Water Rune', 'water', 4, 2, 'Heals and protects'),
      new Rune('rune_earth', 'Earth Rune', 'earth', 6, 3, 'Shields and fortifies'),
      new Rune('rune_air', 'Air Rune', 'air', 3, 1, 'Quick and agile'),
      new Rune('rune_light', 'Light Rune', 'light', 7, 4, 'Purifying light'),
      new Rune('rune_dark', 'Dark Rune', 'dark', 7, 4, 'Shadow magic')
    ];
    for (var i = 0; i < defaultRunes.length; i++) {
      var rune = defaultRunes[i];
      rune.inscribe();
      this._runes[rune.id] = rune;
    }
    this._log('Generated ' + defaultRunes.length + ' default runes');
  };

  // Register a rune in the library
  SpellRuneManager.prototype.registerRune = function (id, name, element, power, cooldown, description) {
    if (this._runes[id]) return { error: 'rune_exists' };
    this._runes[id] = new Rune(id, name, element, power, cooldown, description);
    return { success: true };
  };

  // Inscribe a rune onto a card
  SpellRuneManager.prototype.inscribeOnCard = function (runeId, cardId, slot) {
    var rune = this._runes[runeId];
    if (!rune) return { error: 'rune_not_found' };
    if (!rune.inscribed) return { error: 'rune_not_available' };
    if (this._cooldowns[runeId] > 0) return { error: 'rune_on_cooldown' };

    var inscription = new RuneInscription(rune, slot, cardId);
    this._inscriptions.push(inscription);
    this._stats.totalInscriptions++;
    this._cooldowns[runeId] = rune.cooldown;
    this._save();
    this._log('Inscribed ' + rune.name + ' on slot ' + slot);
    return { success: true, inscription: inscription };
  };

  // Get cooldowns for all runes
  SpellRuneManager.prototype.getCooldown = function (runeId) {
    return this._cooldowns[runeId] || 0;
  };

  // Advance turn (reduces cooldowns)
  SpellRuneManager.prototype.advanceTurn = function () {
    for (var id in this._cooldowns) {
      if (this._cooldowns[id] > 0) this._cooldowns[id]--;
    }
    this._save();
  };

  // Count inscriptions for a card
  SpellRuneManager.prototype.countForCard = function (cardId) {
    var count = 0;
    for (var i = 0; i < this._inscriptions.length; i++) {
      if (this._inscriptions[i].carvedBy === cardId) count++;
    }
    return count;
  };

  // Get inscriptions by element
  SpellRuneManager.prototype.getByElement = function (element) {
    var result = [];
    for (var id in this._runes) {
      if (this._runes[id].element === element) result.push(this._runes[id]);
    }
    return result;
  };

  // Check elemental combo (2+ different elements)
  SpellRuneManager.prototype.checkElementalCombo = function (cardId) {
    var elements = {};
    for (var i = 0; i < this._inscriptions.length; i++) {
      var ins = this._inscriptions[i];
      if (ins.carvedBy === cardId) elements[ins.element] = true;
    }
    var distinct = Object.keys(elements).length;
    if (distinct >= 2) {
      this._stats.elementalCombos++;
      this._save();
      return true;
    }
    return false;
  };

  // List all runes
  SpellRuneManager.prototype.listRunes = function () {
    var result = [];
    for (var id in this._runes) result.push(this._runes[id]);
    return result;
  };

  // Get stats
  SpellRuneManager.prototype.getStats = function () {
    return {
      totalInscriptions: this._stats.totalInscriptions,
      elementalCombos: this._stats.elementalCombos
    };
  };

  // List inscriptions
  SpellRuneManager.prototype.listInscriptions = function () {
    return this._inscriptions.slice();
  };

  // Get rune by id
  SpellRuneManager.prototype.getRune = function (id) {
    return this._runes[id] || null;
  };

  // --------------------------------------------------------------------===
  // Exports
  // --------------------------------------------------------------------===
  window.Rune = Rune;
  window.RuneInscription = RuneInscription;
  window.SpellRuneManager = SpellRuneManager;
})();