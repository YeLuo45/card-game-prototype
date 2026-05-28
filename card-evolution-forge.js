// ============================================================================
// Card Evolution Forge — V176 Direction A
// Auto-evolving cards that gain strength through battle experience
// nanobot distributed mesh + generic-agent autonomous goal pursuit
// ============================================================================
'use strict';

(function () {
  // --------------------------------------------------------------------===
  // CardExperience: Tracks XP for a single card
  // ========================================================================
  function CardExperience(evolutionId, level, xp, xpToNext) {
    this.evolutionId = evolutionId;
    this.level = level || 1;
    this.xp = xp || 0;
    this.xpToNext = xpToNext || 100;
    this.abilities = []; // array of unlocked abilities
    this.tier = 'common'; // common, uncommon, rare, epic, legendary
    this._updateTier(); // ensure tier matches initial level
  }

  CardExperience.prototype.addXP = function (amount) {
    this.xp += amount;
    var leveledUp = false;
    while (this.xp >= this.xpToNext && this.level < 10) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = Math.floor(this.xpToNext * 1.5);
      leveledUp = true;
    }
    // Always update tier after XP gain (even if 0) for correct tier tracking
    this._updateTier();
    return { success: true, leveledUp: leveledUp, currentLevel: this.level };
  };

  CardExperience.prototype._updateTier = function () {
    if (this.level >= 8) this.tier = 'legendary';
    else if (this.level >= 6) this.tier = 'epic';
    else if (this.level >= 4) this.tier = 'rare';
    else if (this.level >= 2) this.tier = 'uncommon';
    else this.tier = 'common';
  };

  CardExperience.prototype.unlockAbility = function (abilityName) {
    if (this.abilities.indexOf(abilityName) >= 0) return { error: 'already_owned' };
    this.abilities.push(abilityName);
    return { success: true, ability: abilityName };
  };

  CardExperience.prototype.getStats = function () {
    return {
      level: this.level,
      xp: this.xp,
      xpToNext: this.xpToNext,
      tier: this.tier,
      abilities: this.abilities.slice()
    };
  };

  // ----------------------------------------------------------------=======
  // CardEvolutionManager: Manages all card evolutions
  // ========================================================================
  function CardEvolutionManager(storageKey) {
    this.storageKey = storageKey || 'card_evolution';
    this._experiences = {}; // cardId -> CardExperience
    this._evolutionIdCounter = 0;
    this._autoSave = true;
    this._init();
  }

  CardEvolutionManager.prototype._init = function () {
    this._load();
  };

  CardEvolutionManager.prototype._load = function () {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var raw = localStorage.getItem(this.storageKey);
        if (raw) {
          var data = JSON.parse(raw);
          // reconstruct CardExperience objects
          var expData = data.experiences || {};
          for (var cardId in expData) {
            var e = expData[cardId];
            var ce = new CardExperience(e.evolutionId, e.level, e.xp, e.xpToNext);
            ce.tier = e.tier || 'common';
            ce.abilities = e.abilities || [];
            this._experiences[cardId] = ce;
          }
        }
      }
    } catch (err) {}
  };

  CardEvolutionManager.prototype._save = function () {
    if (!this._autoSave) return;
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var data = {};
        for (var cardId in this._experiences) {
          var e = this._experiences[cardId];
          data[cardId] = {
            evolutionId: e.evolutionId,
            level: e.level,
            xp: e.xp,
            xpToNext: e.xpToNext,
            tier: e.tier,
            abilities: e.abilities
          };
        }
        localStorage.setItem(this.storageKey, JSON.stringify({ experiences: data }));
      }
    } catch (err) {}
  };

  CardEvolutionManager.prototype.registerCard = function (cardId, initialXP) {
    if (this._experiences[cardId]) return { error: 'already_registered' };
    var evoId = 'evo_' + (++this._evolutionIdCounter);
    var xp = initialXP || 0;
    this._experiences[cardId] = new CardExperience(evoId, 1, xp, 100);
    this._save();
    return { success: true, evolutionId: evoId };
  };

  CardEvolutionManager.prototype.getExperience = function (cardId) {
    return this._experiences[cardId] || null;
  };

  CardEvolutionManager.prototype.addXPToCard = function (cardId, amount) {
    var exp = this._experiences[cardId];
    if (!exp) return { error: 'card_not_found' };
    var result = exp.addXP(amount);
    this._save();
    return result;
  };

  CardEvolutionManager.prototype.unlockAbilityForCard = function (cardId, abilityName) {
    var exp = this._experiences[cardId];
    if (!exp) return { error: 'card_not_found' };
    var r = exp.unlockAbility(abilityName);
    if (r.success) this._save();
    return r;
  };

  CardEvolutionManager.prototype.getAllExperiences = function () {
    var result = [];
    for (var cardId in this._experiences) {
      result.push(this._experiences[cardId]);
    }
    return result;
  };

  CardEvolutionManager.prototype.getTopEvolvedCards = function (count) {
    var all = this.getAllExperiences();
    all.sort(function (a, b) { return b.level - a.level; });
    return all.slice(0, count || 5);
  };

  CardEvolutionManager.prototype.getCardsByTier = function (tier) {
    var result = [];
    for (var cardId in this._experiences) {
      if (this._experiences[cardId].tier === tier) result.push(this._experiences[cardId]);
    }
    return result;
  };

  CardEvolutionManager.prototype.resetCard = function (cardId) {
    var exp = this._experiences[cardId];
    if (!exp) return { error: 'card_not_found' };
    exp.level = 1;
    exp.xp = 0;
    exp.xpToNext = 100;
    exp.tier = 'common';
    exp.abilities = [];
    this._save();
    return { success: true };
  };

  // --------------------------------------------------------------------===
  // Exports
  // ----------------------------------------------------------------=======
  window.CardExperience = CardExperience;
  window.CardEvolutionManager = CardEvolutionManager;
})();