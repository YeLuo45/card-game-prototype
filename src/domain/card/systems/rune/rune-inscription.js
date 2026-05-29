// ============================================================================
// Card Rune Inscription System — V161 Direction W
// Rune-based card enhancement with sigil crafting and power infusion
// ruflo hierarchical decomposition + generic-agent autonomous enhancement
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // Rune: A single rune with properties
  // ========================================================================
  function Rune(id, name, element, power, description, tier) {
    this.id = id || '';
    this.name = name || '';
    this.element = element || 'neutral';
    this.power = power || 1;
    this.description = description || '';
    this.tier = tier || 1; // 1-5
    this.isInscribed = false;
    this.inscribedTo = null; // cardId
  }

  Rune.prototype.getPower = function () { return this.power; };

  // --------------------------------------------------------------------===
  // RuneSigil: A sigil pattern combining multiple runes
  // ========================================================================
  function RuneSigil(id, name, runeIds, bonuses, description) {
    this.id = id || '';
    this.name = name || '';
    this.runeIds = runeIds || [];
    this.bonuses = bonuses || {}; // e.g. { attack: 10, health: 5, abilityBoost: 2 }
    this.description = description || '';
    this.activated = false;
    this.activationCount = 0;
  }

  RuneSigil.prototype.canActivate = function (runes) {
    // Check if all required runes are available
    var available = 0;
    for (var i = 0; i < this.runeIds.length; i++) {
      for (var j = 0; j < runes.length; j++) {
        if (runes[j].id === this.runeIds[i] && !runes[j].isInscribed) {
          available++;
          break;
        }
      }
    }
    return available >= this.runeIds.length;
  };

  RuneSigil.prototype.activate = function (runes) {
    if (!this.canActivate(runes)) return { error: 'missing_runes' };
    this.activated = true;
    this.activationCount++;
    return { success: true, bonuses: this.bonuses };
  };

  // --------------------------------------------------------------------===
  // Inscription: Links a rune to a card
  // ========================================================================
  function Inscription(runeId, cardId, powerLevel, at) {
    this.runeId = runeId || '';
    this.cardId = cardId || '';
    this.powerLevel = powerLevel || 1;
    this.at = at || Date.now();
  }

  // --------------------------------------------------------------------===
  // CardInscription: Main inscription system
  // ========================================================================
  function CardInscription(storageKey) {
    this.storageKey = storageKey || 'card_inscription';
    this._runes = {}; // runeId -> Rune
    this._sigils = {}; // sigilId -> RuneSigil
    this._inscriptions = []; // array of Inscription
    this._cardRunes = {}; // cardId -> array of runeIds
    this._stats = { totalInscriptions: 0, totalSigilActivations: 0 };
    this._init();
  }

  CardInscription.prototype._init = function () {
    this._load();
    if (Object.keys(this._runes).length === 0) this._generateDefaultRunes();
  };

  CardInscription.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          this._runes = data.runes || {};
          this._sigils = data.sigils || {};
          this._inscriptions = data.inscriptions || [];
          this._cardRunes = data.cardRunes || {};
          this._stats = data.stats || this._stats;
        }
      }
    } catch (e) {}
  };

  CardInscription.prototype._save = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify({
          runes: this._runes,
          sigils: this._sigils,
          inscriptions: this._inscriptions,
          cardRunes: this._cardRunes,
          stats: this._stats
        }));
      }
    } catch (e) {}
  };

  CardInscription.prototype._log = function (msg) {
    if (typeof console !== 'undefined' && console.log) console.log('[CardInscription] ' + msg);
  };

  CardInscription.prototype._generateDefaultRunes = function () {
    var fireRune = new Rune('r_fire', 'Fire Rune', 'fire', 5, 'Increases fire damage', 2);
    var iceRune = new Rune('r_ice', 'Ice Rune', 'ice', 4, 'Slows enemies', 2);
    var lightningRune = new Rune('r_lightning', 'Lightning Rune', 'lightning', 6, 'Chain lightning', 3);
    var earthRune = new Rune('r_earth', 'Earth Rune', 'earth', 3, 'Stone armor', 1);
    var windRune = new Rune('r_wind', 'Wind Rune', 'wind', 4, 'Increases speed', 2);
    var darkRune = new Rune('r_dark', 'Dark Rune', 'dark', 7, 'Shadow damage', 4);

    this._runes['r_fire'] = fireRune;
    this._runes['r_ice'] = iceRune;
    this._runes['r_lightning'] = lightningRune;
    this._runes['r_earth'] = earthRune;
    this._runes['r_wind'] = windRune;
    this._runes['r_dark'] = darkRune;

    // Create sigils
    var fireSigil = new RuneSigil('s_fire', 'Fire Sigil', ['r_fire', 'r_fire'], { attack: 15, fireDamage: 10 }, 'Double fire power');
    var iceSigil = new RuneSigil('s_ice', 'Ice Sigil', ['r_ice', 'r_earth'], { health: 20, defense: 5 }, 'Frost armor');
    var lightningSigil = new RuneSigil('s_lightning', 'Lightning Sigil', ['r_lightning', 'r_wind'], { attack: 20, speed: 3 }, 'Storm power');
    var chaosSigil = new RuneSigil('s_chaos', 'Chaos Sigil', ['r_fire', 'r_ice', 'r_lightning'], { attack: 25, abilityBoost: 3 }, 'Triple element chaos');

    this._sigils['s_fire'] = fireSigil;
    this._sigils['s_ice'] = iceSigil;
    this._sigils['s_lightning'] = lightningSigil;
    this._sigils['s_chaos'] = chaosSigil;

    this._log('Generated default runes and sigils');
  };

  // Get rune
  CardInscription.prototype.getRune = function (runeId) {
    return this._runes[runeId] || null;
  };

  // List available runes (not inscribed)
  CardInscription.prototype.listAvailableRunes = function () {
    var result = [];
    for (var id in this._runes) {
      if (!this._runes[id].isInscribed) result.push(this._runes[id]);
    }
    return result;
  };

  // Inscribe rune to card
  CardInscription.prototype.inscribe = function (runeId, cardId) {
    var rune = this._runes[runeId];
    if (!rune) return { error: 'rune_not_found' };
    if (rune.isInscribed) return { error: 'rune_already_inscribed' };

    rune.isInscribed = true;
    rune.inscribedTo = cardId;

    var inscription = new Inscription(runeId, cardId, rune.power, Date.now());
    this._inscriptions.push(inscription);

    if (!this._cardRunes[cardId]) this._cardRunes[cardId] = [];
    this._cardRunes[cardId].push(runeId);

    this._stats.totalInscriptions++;
    this._save();
    return { success: true, inscription: inscription };
  };

  // Remove inscription (uninscribe)
  CardInscription.prototype.uninscribe = function (runeId) {
    var rune = this._runes[runeId];
    if (!rune) return { error: 'rune_not_found' };
    if (!rune.isInscribed) return { error: 'rune_not_inscribed' };

    rune.isInscribed = false;
    var oldCard = rune.inscribedTo;
    rune.inscribedTo = null;

    // Remove from cardRunes
    if (this._cardRunes[oldCard]) {
      var idx = this._cardRunes[oldCard].indexOf(runeId);
      if (idx >= 0) this._cardRunes[oldCard].splice(idx, 1);
    }

    this._save();
    return { success: true };
  };

  // Get runes for a card
  CardInscription.prototype.getCardRunes = function (cardId) {
    if (!this._cardRunes[cardId]) return [];
    var result = [];
    for (var i = 0; i < this._cardRunes[cardId].length; i++) {
      var rune = this._runes[this._cardRunes[cardId][i]];
      if (rune) result.push(rune);
    }
    return result;
  };

  // Activate sigil
  CardInscription.prototype.activateSigil = function (sigilId) {
    var sigil = this._sigils[sigilId];
    if (!sigil) return { error: 'sigil_not_found' };

    var allRunes = [];
    for (var id in this._runes) allRunes.push(this._runes[id]);

    var result = sigil.activate(allRunes);
    if (result.success) {
      this._stats.totalSigilActivations++;
      this._save();
    }
    return result;
  };

  // List sigils
  CardInscription.prototype.listSigils = function () {
    var result = [];
    for (var id in this._sigils) result.push(this._sigils[id]);
    return result;
  };

  // Get sigil
  CardInscription.prototype.getSigil = function (sigilId) {
    return this._sigils[sigilId] || null;
  };

  // Get inscriptions
  CardInscription.prototype.getInscriptions = function (limit) {
    return this._inscriptions.slice(-(limit || 10));
  };

  // Get stats
  CardInscription.prototype.getStats = function () {
    return {
      totalInscriptions: this._stats.totalInscriptions,
      totalSigilActivations: this._stats.totalSigilActivations,
      totalRunes: Object.keys(this._runes).length,
      totalSigils: Object.keys(this._sigils).length
    };
  };

  // Add custom rune
  CardInscription.prototype.addRune = function (id, name, element, power, description, tier) {
    if (this._runes[id]) return { error: 'rune_exists' };
    this._runes[id] = new Rune(id, name, element, power, description, tier);
    this._save();
    return { success: true };
  };

  // Add custom sigil
  CardInscription.prototype.addSigil = function (id, name, runeIds, bonuses, description) {
    if (this._sigils[id]) return { error: 'sigil_exists' };
    this._sigils[id] = new RuneSigil(id, name, runeIds, bonuses, description);
    this._save();
    return { success: true };
  };

  // --------------------------------------------------------------------===
  // Exports
  // ----------------------------------------------------------------=======
  window.Rune = Rune;
  window.RuneSigil = RuneSigil;
  window.Inscription = Inscription;
  window.CardInscription = CardInscription;
})();